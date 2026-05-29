import { PrismaClient } from '@prisma/client';
import { refundMidtransTransaction } from './midtrans.js';
import { recordFinancialAuditLog } from '../audit/auditLogger.js';

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

  if (!['paid', 'settled'].includes(paymentIntent.status)) {
    throw { code: 'BAD_REQUEST', message: 'Only paid or settled payments can be refunded', status: 400 };
  }

  // 2. Role-based access validation
  const userId = BigInt(actorId);
  let isAuthorized = actorRoles.includes('admin') || actorRoles.includes('super_admin');

  if (!isAuthorized) {
    if (paymentIntent.ownerType === 'clinic' && paymentIntent.ownerClinicId) {
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
    } else if (paymentIntent.ownerType === 'dentist' && paymentIntent.ownerDentistId) {
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
      refundStatus: 'refunded'
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

    refundStatus = 'refunded';
    providerRefundReference = providerRefundResult.refund_id || providerRefundResult.providerRefundReference || `mock-ref-${Date.now()}`;
  } catch (error) {
    console.error('[RefundService] Midtrans API Refund request failed:', error);
    refundStatus = 'rejected';
    
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

    // Update invoice status if fully refunded
    if (isFullRefund) {
      const invoice = await tx.invoice.findFirst({
        where: { paymentIntentId: intentIdBigInt }
      });
      if (invoice) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: 'refunded' }
        });
      }
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
        entryType: 'refund',
        status: newStatus,
        direction: 'debit',
        amount: refundAmount,
        currency: paymentIntent.currency || 'IDR',
        source: 'midtrans',
        metadata: { refundId: refund.id.toString() }
      }
    });

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
