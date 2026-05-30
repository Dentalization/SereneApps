import { PrismaClient } from '@prisma/client';
import { refundMidtransTransaction } from './midtrans.js';
import { recordFinancialAuditLog } from '../audit/auditLogger.js';
import { FINANCIAL_OWNER_TYPES, normalizeFinancialOwnerType } from './ownership.js';
import { assertPeriodNotLocked } from './periodLockService.js';

const prisma = new PrismaClient();

/**
 * Execute a refund for a payment intent.
 */
export async function processRefund({
  paymentIntentId,
  refundAmount,
  refundReason,
  actorId,
  actorRoles = [],
  ipAddress = null
}) {
  const intentIdBigInt = BigInt(paymentIntentId);

  // 1. Fetch payment intent with appointment and owner
  const paymentIntent = await prisma.paymentIntent.findUnique({
    where: { id: intentIdBigInt },
    include: { appointment: true }
  });

  if (!paymentIntent) {
    throw { code: 'NOT_FOUND', message: 'Payment intent not found', status: 404 };
  }

  // Assert period not locked before refund
  await assertPeriodNotLocked(paymentIntent.createdAt);

  if (!['paid', 'settled'].includes(paymentIntent.status)) {
    throw { code: 'BAD_REQUEST', message: 'Only paid or settled payments can be refunded', status: 400 };
  }

  // 2. Role-based access validation
  const userId = BigInt(actorId);
  let isAuthorized = actorRoles.includes('admin') || actorRoles.includes('super_admin');

  if (!isAuthorized) {
    const ownerType = normalizeFinancialOwnerType(paymentIntent.ownerType);
    if (ownerType === FINANCIAL_OWNER_TYPES.CLINIC && paymentIntent.ownerClinicId) {
      // Check if user is staff/owner of this clinic
      const staffRecord = await prisma.clinicStaff.findFirst({
        where: {
          userId,
          clinicProfileId: paymentIntent.ownerClinicId,
          isActive: true
        }
      });
      const clinicOwner = await prisma.clinicProfile.findFirst({
        where: {
          id: paymentIntent.ownerClinicId,
          userId
        }
      });
      if (staffRecord || clinicOwner) {
        isAuthorized = true;
      }
    } else if (ownerType === FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST && paymentIntent.ownerDentistId) {
      // Check if independent dentist owns this payment intent
      if (paymentIntent.ownerDentistId === userId) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    throw { code: 'FORBIDDEN', message: 'You are not authorized to perform refunds for this transaction', status: 403 };
  }

  // Calculate previously refunded amount
  const previousRefunds = await prisma.refund.findMany({
    where: {
      paymentIntentId: intentIdBigInt,
      refundStatus: { in: ['processed', 'refunded'] }
    }
  });
  const totalPreviouslyRefunded = previousRefunds.reduce((sum, r) => sum + r.refundAmount, 0);
  const remainingRefundableAmount = paymentIntent.amount - totalPreviouslyRefunded;

  if (refundAmount > remainingRefundableAmount) {
    throw { code: 'BAD_REQUEST', message: `Requested refund amount exceeds remaining refundable amount (${remainingRefundableAmount} IDR)`, status: 400 };
  }

  // 3. Trigger Midtrans Refund
  let providerRefundResult = null;
  let refundStatus = 'pending';
  let providerRefundReference = null;

  try {
    providerRefundResult = await refundMidtransTransaction({
      orderId: paymentIntent.providerOrderId,
      amount: refundAmount,
      reason: refundReason
    });

    refundStatus = 'processed';
    providerRefundReference = providerRefundResult.refund_id || providerRefundResult.providerRefundReference || `mock-ref-${Date.now()}`;
  } catch (error) {
    console.error('[RefundService] Midtrans API Refund request failed:', error);
    refundStatus = 'failed';
    
    await recordFinancialAuditLog({
      actorId,
      actorRole: actorRoles[0] || 'anonymous',
      entityType: 'payment_intent',
      entityId: paymentIntentId.toString(),
      action: 'refund_rejected',
      metadata: {
        amount: refundAmount,
        reason: refundReason,
        error: error.message || error
      }
    });

    throw { code: 'PROVIDER_ERROR', message: `Provider refund rejected: ${error.message || error}`, status: 502 };
  }

  // 4. Save to Database (Prisma Transaction)
  const result = await prisma.$transaction(async (tx) => {
    // Create refund record
    const refund = await tx.refund.create({
      data: {
        paymentIntentId: intentIdBigInt,
        refundAmount,
        refundReason,
        refundStatus,
        refundActorId: userId,
        providerRefundReference,
        internalNotes: 'Automated Midtrans Snap refund request'
      }
    });

    // Update payment intent status
    const isFullRefund = (totalPreviouslyRefunded + refundAmount) >= paymentIntent.amount;
    const newStatus = isFullRefund ? 'refunded' : 'partial_refund';

    await tx.paymentIntent.update({
      where: { id: intentIdBigInt },
      data: { status: newStatus, activeAppointmentId: null }
    });

    // Update invoice status
    const invoice = await tx.invoice.findFirst({
      where: { paymentIntentId: intentIdBigInt }
    });
    if (invoice) {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus }
      });
    }

    // Write internal ledger debit entries
    await tx.paymentLedger.create({
      data: {
        paymentIntentId: intentIdBigInt,
        entryType: 'refund',
        status: newStatus,
        amount: refundAmount,
        metadata: { refundId: refund.id.toString(), providerRefundResult }
      }
    });

    // Write financial ledger entry
    await tx.financialLedgerEntry.create({
      data: {
        paymentIntentId: intentIdBigInt,
        appointmentId: paymentIntent.appointmentId,
        ownerType: paymentIntent.ownerType,
        ownerClinicId: paymentIntent.ownerClinicId,
        ownerDentistId: paymentIntent.ownerDentistId,
        entryType: isFullRefund ? 'REFUND' : 'PARTIAL_REFUND',
        status: newStatus,
        direction: 'debit',
        amount: refundAmount,
        currency: paymentIntent.currency || 'IDR',
        source: 'midtrans',
        metadata: { refundId: refund.id.toString() }
      }
    });

    // 1. Update available balance record to decrement availableAmount
    const whereBalance = paymentIntent.ownerType === 'clinic'
      ? { ownerClinicId: paymentIntent.ownerClinicId }
      : { ownerDentistId: paymentIntent.ownerDentistId };

    const balance = await tx.availableBalance.findFirst({ where: whereBalance });
    const isNegative = balance ? (balance.availableAmount - refundAmount < 0) : true;

    if (balance) {
      await tx.availableBalance.update({
        where: { id: balance.id },
        data: {
          availableAmount: { decrement: refundAmount }
        }
      });
    } else {
      await tx.availableBalance.create({
        data: {
          ownerType: paymentIntent.ownerType,
          ownerClinicId: paymentIntent.ownerClinicId,
          ownerDentistId: paymentIntent.ownerDentistId,
          availableAmount: -refundAmount,
          pendingAmount: 0,
          currency: paymentIntent.currency || 'IDR'
        }
      });
    }

    // Write a DEBT ledger entry if the balance went negative
    if (isNegative) {
      const currentAvailable = balance ? balance.availableAmount : 0;
      const debtAmount = Math.abs(currentAvailable - refundAmount);
      await tx.financialLedgerEntry.create({
        data: {
          paymentIntentId: intentIdBigInt,
          appointmentId: paymentIntent.appointmentId,
          ownerType: paymentIntent.ownerType,
          ownerClinicId: paymentIntent.ownerClinicId,
          ownerDentistId: paymentIntent.ownerDentistId,
          entryType: 'DEBT',
          status: 'completed',
          direction: 'debit',
          amount: debtAmount,
          source: 'system',
          metadata: { refundId: refund.id.toString(), note: 'Available balance went negative after refund' }
        }
      });
    }

    // 2. If clinic dentist appointment, reverse compensation (30% of refundAmount)
    if (paymentIntent.ownerType === 'clinic' && paymentIntent.appointmentId) {
      const appRecord = await tx.appointment.findUnique({
        where: { id: paymentIntent.appointmentId }
      });
      if (appRecord?.dentistId) {
        const profile = await tx.dentistProfile.findFirst({
          where: { userId: appRecord.dentistId }
        });
        if (profile?.dentist_type === 'clinic') {
          const reversedCompensation = Math.round(refundAmount * 0.3);
          
          await tx.dentistCompensationEntry.create({
            data: {
              appointmentId: paymentIntent.appointmentId,
              paymentIntentId: paymentIntent.id,
              dentistId: appRecord.dentistId,
              clinicId: paymentIntent.ownerClinicId,
              entryType: 'REVERSAL',
              amount: reversedCompensation,
              status: 'paid',
              metadata: { refundId: refund.id.toString() }
            }
          });

          await tx.financialLedgerEntry.create({
            data: {
              paymentIntentId: paymentIntent.id,
              appointmentId: paymentIntent.appointmentId,
              ownerType: 'dentist',
              ownerDentistId: appRecord.dentistId,
              entryType: 'REVERSAL',
              status: 'completed',
              direction: 'debit',
              amount: reversedCompensation,
              source: 'system',
              metadata: { refundId: refund.id.toString() }
            }
          });

          // Decrement the dentist's available balance
          const dentistBalance = await tx.availableBalance.findFirst({
            where: { ownerDentistId: appRecord.dentistId }
          });
          if (dentistBalance) {
            await tx.availableBalance.update({
              where: { id: dentistBalance.id },
              data: {
                availableAmount: { decrement: reversedCompensation }
              }
            });
          } else {
            await tx.availableBalance.create({
              data: {
                ownerType: 'dentist',
                ownerDentistId: appRecord.dentistId,
                availableAmount: -reversedCompensation,
                pendingAmount: 0,
                currency: paymentIntent.currency || 'IDR'
              }
            });
          }
        }
      }
    }

    return refund;
  });

  // 5. Write Financial Audit Log
  await recordFinancialAuditLog({
    actorId,
    actorRole: actorRoles[0] || 'anonymous',
    entityType: 'refund',
    entityId: result.id.toString(),
    action: 'refund_approved',
    metadata: {
      paymentIntentId: paymentIntentId.toString(),
      refundAmount,
      refundReason,
      refundStatus,
      providerRefundReference
    }
  });

  return result;
}
