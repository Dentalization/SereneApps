import { PrismaClient } from '@prisma/client';
import { ensureCommunicationResourcesForAppointment, emitAppointmentEvent } from '../communications.js';
import { queueNotificationEvent } from '../notifications/index.js';
import { recordLedgerEntryIfMissing } from './ledger.js';
import { recordFinancialEntry, ensureInvoiceForPaymentIntent } from './financials.js';
import { createPaymentSnapshot } from './snapshotService.js';
import { createSettlement } from './settlementService.js';
import { accrueCompensation } from './compensationService.js';

const prisma = new PrismaClient();

export const PAYMENT_STATUSES = Object.freeze({
  PENDING: 'pending',
  REQUIRES_ACTION: 'requires_action',
  PAID: 'paid',
  SETTLED: 'settled',
  FAILED: 'failed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIAL_REFUND: 'partial_refund'
});

export const VALID_PAYMENT_STATUSES = Object.values(PAYMENT_STATUSES);

export const ACTIVE_PAYMENT_STATUSES = new Set([
  PAYMENT_STATUSES.PENDING,
  PAYMENT_STATUSES.REQUIRES_ACTION,
  PAYMENT_STATUSES.PAID
]);

export function resolveActiveAppointmentId(status, appointmentId) {
  if (!appointmentId) return null;
  return ACTIVE_PAYMENT_STATUSES.has(status) ? appointmentId : null;
}

function parsePositiveAmount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

export function resolveRefundAmount(providerResponse = {}, paymentAmount = 0) {
  const paymentTotal = parsePositiveAmount(paymentAmount) || 0;
  const directAmount = parsePositiveAmount(providerResponse.refund_amount ?? providerResponse.refundAmount);
  if (directAmount) return Math.min(directAmount, paymentTotal);

  if (Array.isArray(providerResponse.refund_amounts)) {
    const summed = providerResponse.refund_amounts.reduce((sum, item) => {
      return sum + (parsePositiveAmount(item?.amount ?? item?.refund_amount ?? item?.refundAmount) || 0);
    }, 0);
    if (summed > 0) return Math.min(summed, paymentTotal);
  }

  return paymentTotal;
}

const appointmentSelect = {
  id: true,
  dentistId: true,
  patientId: true,
  status: true,
  chatRoomRef: true,
  videoRoomRef: true,
  commStatus: true,
  ownerType: true,
  ownerClinicId: true
};

function mapStatusToAppointment(status) {
  switch (status) {
    case PAYMENT_STATUSES.PAID:
    case PAYMENT_STATUSES.SETTLED:
      return 'confirmed';
    case PAYMENT_STATUSES.FAILED:
    case PAYMENT_STATUSES.EXPIRED:
      return 'payment_failed';
    case PAYMENT_STATUSES.CANCELLED:
      return 'cancelled';
    default:
      return null;
  }
}

function mapStatusToEvent(status) {
  switch (status) {
    case PAYMENT_STATUSES.PAID:
    case PAYMENT_STATUSES.SETTLED:
      return 'appointment_confirmed';
    case PAYMENT_STATUSES.FAILED:
    case PAYMENT_STATUSES.EXPIRED:
      return 'appointment_payment_failed';
    case PAYMENT_STATUSES.CANCELLED:
      return 'appointment_cancelled';
    default:
      return 'payment_status_updated';
  }
}

async function syncCommunications(appointment, status) {
  if (!appointment) return null;
  const appointmentId = appointment.id;

  if (status === 'confirmed') {
    const resources = await ensureCommunicationResourcesForAppointment({
      appointmentId,
      reason: 'payment_status_sync'
    });

    await queueNotificationEvent({
      eventType: 'chat_invite',
      appointmentId,
      payload: {
        roomName: resources.roomName,
        conversationSid: resources.conversationSid
      }
    }).catch((error) => {
      console.error('Chat invite notification error:', error);
    });

    return { chatRoomRef: resources.chatRoom.channelName, videoRoomRef: resources.roomName };
  }

  if (['payment_failed', 'cancelled'].includes(status)) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { commStatus: 'cancelled' }
    }).catch(() => null);
  }

  return null;
}

export function canTransition(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true;
  const allowed = {
    [PAYMENT_STATUSES.PENDING]: [
      PAYMENT_STATUSES.REQUIRES_ACTION,
      PAYMENT_STATUSES.PAID,
      PAYMENT_STATUSES.SETTLED,
      PAYMENT_STATUSES.FAILED,
      PAYMENT_STATUSES.EXPIRED,
      PAYMENT_STATUSES.CANCELLED
    ],
    [PAYMENT_STATUSES.REQUIRES_ACTION]: [
      PAYMENT_STATUSES.PAID,
      PAYMENT_STATUSES.SETTLED,
      PAYMENT_STATUSES.FAILED,
      PAYMENT_STATUSES.EXPIRED,
      PAYMENT_STATUSES.CANCELLED
    ],
    [PAYMENT_STATUSES.PAID]: [
      PAYMENT_STATUSES.SETTLED,
      PAYMENT_STATUSES.REFUNDED,
      PAYMENT_STATUSES.PARTIAL_REFUND
    ],
    [PAYMENT_STATUSES.SETTLED]: [
      PAYMENT_STATUSES.REFUNDED,
      PAYMENT_STATUSES.PARTIAL_REFUND
    ],
    [PAYMENT_STATUSES.PARTIAL_REFUND]: [
      PAYMENT_STATUSES.REFUNDED
    ]
  };

  const nextStatuses = allowed[fromStatus] || [];
  return nextStatuses.includes(toStatus);
}

export async function applyPaymentStatus({
  paymentIntentId,
  newStatus,
  providerPaymentId,
  providerResponse,
  failureReason,
  tx: externalTx
}) {
  if (!VALID_PAYMENT_STATUSES.includes(newStatus)) {
    const error = new Error(`Invalid status: ${newStatus}`);
    error.status = 400;
    throw error;
  }

  const runUpdates = async (tx) => {
    const intent = await tx.paymentIntent.findUnique({
      where: { id: BigInt(paymentIntentId) },
      include: {
        appointment: { select: appointmentSelect },
        patient: { select: { id: true, name: true, email: true, phone_number: true } }
      }
    });

    if (!intent) {
      const error = new Error('PAYMENT_INTENT_NOT_FOUND');
      error.status = 404;
      throw error;
    }

    if (intent.status === newStatus) {
      return {
        paymentIntent: intent,
        appointmentStatus: mapStatusToAppointment(newStatus),
        appointment: intent.appointment,
        noOp: true
      };
    }

    if (!canTransition(intent.status, newStatus)) {
      const error = new Error('PAYMENT_STATUS_TRANSITION_INVALID');
      error.status = 400;
      throw error;
    }

    const mergedProviderResponse = {
      ...(intent.providerResponse || {}),
      ...(providerResponse || {})
    };
    if (failureReason) {
      mergedProviderResponse.failureReason = failureReason;
    }

    // Check accounting period lock
    // For webhook-driven updates, if the period is locked, we want to allow updating the intent status, 
    // but we ensure all new financial transactions are dated today (active period).
    const periodKey = intent.createdAt.toISOString().slice(0, 7);
    const lockedPeriod = await tx.accountingPeriod.findUnique({
      where: { periodKey }
    });
    const isLocked = !!lockedPeriod?.isLocked;

    // If it's a manual transition (no externalTx) and locked, reject
    if (isLocked && !externalTx) {
      throw {
        status: 400,
        code: 'PERIOD_LOCKED',
        message: `Operation rejected: The accounting period for ${periodKey} is locked.`
      };
    }

    const updatedIntent = await tx.paymentIntent.update({
      where: { id: intent.id },
      data: {
        status: newStatus,
        providerPaymentId: providerPaymentId || intent.providerPaymentId,
        providerResponse: mergedProviderResponse,
        metadata: failureReason
          ? { ...(intent.metadata || {}), failureReason }
          : intent.metadata,
        activeAppointmentId: resolveActiveAppointmentId(newStatus, intent.appointmentId)
      },
      include: {
        appointment: { select: appointmentSelect },
        patient: { select: { id: true, name: true, email: true, phone_number: true } }
      }
    });

    const appointmentStatus = mapStatusToAppointment(newStatus);
    let appointment = updatedIntent.appointment;

    if (appointmentStatus) {
      appointment = await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: appointmentStatus },
        select: appointmentSelect
      });
    }

    if ([PAYMENT_STATUSES.PAID, PAYMENT_STATUSES.SETTLED].includes(newStatus)) {
      const entryType = newStatus === PAYMENT_STATUSES.SETTLED ? 'SETTLEMENT_COMPLETED' : 'PAYMENT_RECEIVED';

      await recordLedgerEntryIfMissing({
        paymentIntentId: intent.id,
        entryType: newStatus === PAYMENT_STATUSES.SETTLED ? 'settlement' : 'charge',
        status: newStatus,
        amount: updatedIntent.amount,
        metadata: mergedProviderResponse
      }, tx);

      await recordFinancialEntry({
        tx,
        paymentIntent: updatedIntent,
        appointment: updatedIntent.appointment,
        entryType,
        status: newStatus,
        direction: 'credit',
        amount: updatedIntent.amount,
        source: updatedIntent.provider || 'midtrans',
        metadata: mergedProviderResponse
      });

      const invoice = await ensureInvoiceForPaymentIntent({
        tx,
        paymentIntent: updatedIntent,
        appointment: updatedIntent.appointment,
        patient: updatedIntent.patient
      });

      if (invoice?.id) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: newStatus === PAYMENT_STATUSES.SETTLED ? 'settled' : 'paid',
            paidAt: invoice.paidAt || new Date()
          }
        }).catch(() => null);
      }

      if (newStatus === PAYMENT_STATUSES.SETTLED) {
        const snapshot = await createPaymentSnapshot({
          tx,
          paymentIntent: updatedIntent,
          invoice,
          appointment: updatedIntent.appointment
        });

        await createSettlement({
          tx,
          paymentIntent: updatedIntent,
          providerReference: updatedIntent.providerPaymentId
        });

        await accrueCompensation({
          tx,
          paymentIntent: updatedIntent,
          snapshot,
          appointment: updatedIntent.appointment
        });
      }
    }

    if ([PAYMENT_STATUSES.REFUNDED, PAYMENT_STATUSES.PARTIAL_REFUND].includes(newStatus)) {
      const refundAmount = resolveRefundAmount(mergedProviderResponse, updatedIntent.amount);
      const entryType = newStatus === PAYMENT_STATUSES.PARTIAL_REFUND ? 'PARTIAL_REFUND' : 'REFUND';

      await recordLedgerEntryIfMissing({
        paymentIntentId: intent.id,
        entryType: 'refund',
        status: newStatus,
        amount: refundAmount,
        metadata: mergedProviderResponse
      }, tx);

      await recordFinancialEntry({
        tx,
        paymentIntent: updatedIntent,
        appointment: updatedIntent.appointment,
        entryType,
        status: newStatus,
        direction: 'debit',
        amount: refundAmount,
        source: updatedIntent.provider || 'midtrans',
        metadata: mergedProviderResponse
      });

      await tx.invoice.updateMany({
        where: { paymentIntentId: updatedIntent.id },
        data: { status: newStatus }
      }).catch(() => null);

      // Create refund record in the DB if it does not exist
      const providerRefundReference = mergedProviderResponse.refund_key || mergedProviderResponse.refund_id || mergedProviderResponse.refund_reference || providerPaymentId || `webhook-ref-${Date.now()}`;
      const existingRefund = await tx.refund.findFirst({
        where: {
          paymentIntentId: updatedIntent.id,
          providerRefundReference: String(providerRefundReference)
        }
      });
      if (!existingRefund) {
        await tx.refund.create({
          data: {
            paymentIntentId: updatedIntent.id,
            refundAmount,
            refundReason: failureReason || mergedProviderResponse.failureReason || 'Webhook/status refund transition',
            refundStatus: 'refunded',
            providerRefundReference: String(providerRefundReference),
            refundRequestedAt: new Date(),
            refundedAt: new Date()
          }
        });
      }

      // Update available balance record to decrement availableAmount
      const whereBalance = updatedIntent.ownerType === 'clinic'
        ? { ownerClinicId: updatedIntent.ownerClinicId }
        : { ownerDentistId: updatedIntent.ownerDentistId };

      // Concurrency protection: Lock balance row
      let balance = await tx.availableBalance.findFirst({ where: whereBalance });
      if (!balance) {
        balance = await tx.availableBalance.create({
          data: {
            ownerType: updatedIntent.ownerType,
            ownerClinicId: updatedIntent.ownerClinicId,
            ownerDentistId: updatedIntent.ownerDentistId,
            availableAmount: 0,
            pendingAmount: 0,
            currency: updatedIntent.currency || 'IDR'
          }
        });
      }
      await tx.$executeRaw`SELECT id FROM available_balances WHERE id = ${balance.id} FOR UPDATE`;

      const isNegative = balance.availableAmount - refundAmount < 0;
      await tx.availableBalance.update({
        where: { id: balance.id },
        data: {
          availableAmount: { decrement: refundAmount }
        }
      });

      // Write a DEBT ledger entry if the balance went negative
      if (isNegative) {
        const debtAmount = Math.abs(balance.availableAmount - refundAmount);
        await tx.financialLedgerEntry.create({
          data: {
            paymentIntentId: updatedIntent.id,
            appointmentId: updatedIntent.appointmentId,
            ownerType: updatedIntent.ownerType,
            ownerClinicId: updatedIntent.ownerClinicId,
            ownerDentistId: updatedIntent.ownerDentistId,
            entryType: 'DEBT',
            status: 'completed',
            direction: 'debit',
            amount: debtAmount,
            source: 'system',
            metadata: { note: 'Available balance went negative after status transition refund' }
          }
        });
      }

      // If clinic dentist appointment, reverse compensation (30% of refundAmount)
      if (updatedIntent.ownerType === 'clinic' && updatedIntent.appointmentId) {
        const appRecord = await tx.appointment.findUnique({
          where: { id: updatedIntent.appointmentId }
        });
        if (appRecord?.dentistId) {
          const profile = await tx.dentistProfile.findFirst({
            where: { userId: appRecord.dentistId }
          });
          if (profile?.dentist_type === 'clinic') {
            const reversedCompensation = Math.round(refundAmount * 0.3);
            
            await tx.dentistCompensationEntry.create({
              data: {
                appointmentId: updatedIntent.appointmentId,
                paymentIntentId: updatedIntent.id,
                dentistId: appRecord.dentistId,
                clinicId: updatedIntent.ownerClinicId,
                entryType: 'REVERSAL',
                amount: reversedCompensation,
                status: 'paid',
                metadata: { source: 'status_transition_refund' }
              }
            });

            await tx.financialLedgerEntry.create({
              data: {
                paymentIntentId: updatedIntent.id,
                appointmentId: updatedIntent.appointmentId,
                ownerType: 'dentist',
                ownerDentistId: appRecord.dentistId,
                entryType: 'REVERSAL',
                status: 'completed',
                direction: 'debit',
                amount: reversedCompensation,
                source: 'system',
                metadata: { source: 'status_transition_refund' }
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
                  currency: updatedIntent.currency || 'IDR'
                }
              });
            }
          }
        }
      }
    }

    return {
      paymentIntent: updatedIntent,
      appointmentStatus,
      appointment,
      noOp: false
    };
  };

  if (externalTx) {
    return runUpdates(externalTx);
  }

  const result = await prisma.$transaction(async (tx) => {
    return runUpdates(tx);
  });

  if (result.noOp) {
    return {
      paymentIntent: result.paymentIntent,
      appointmentStatus: result.appointmentStatus || result.appointment?.status || result.paymentIntent.status,
      noOp: true
    };
  }

  const resolvedStatus = result.appointmentStatus || result.appointment?.status || newStatus;
  const commPayload = await syncCommunications(result.appointment, resolvedStatus);

  const eventType = mapStatusToEvent(newStatus);
  await emitAppointmentEvent({
    type: eventType,
    appointmentId: result.appointment?.id?.toString?.() ?? '',
    payload: {
      paymentIntentId: result.paymentIntent.id.toString(),
      status: newStatus,
      ...commPayload
    }
  });

  return {
    paymentIntent: result.paymentIntent,
    appointmentStatus: resolvedStatus,
    noOp: false
  };
}

export const __testables = {
  resolveRefundAmount
};

