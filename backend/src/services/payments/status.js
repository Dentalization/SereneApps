import { PrismaClient } from '@prisma/client';
import { ensureCommunicationResourcesForAppointment, emitAppointmentEvent } from '../communications.js';
import { queueNotificationEvent } from '../notifications/index.js';
import { recordLedgerEntryIfMissing } from './ledger.js';
import { recordFinancialEntry, ensureInvoiceForPaymentIntent } from './financials.js';
import { createPaymentSnapshot } from './snapshotService.js';

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
  failureReason
}) {
  if (!VALID_PAYMENT_STATUSES.includes(newStatus)) {
    const error = new Error(`Invalid status: ${newStatus}`);
    error.status = 400;
    throw error;
  }

  const result = await prisma.$transaction(async (tx) => {
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
        entryType: newStatus === PAYMENT_STATUSES.SETTLED ? 'settlement' : 'charge',
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

      if (newStatus === PAYMENT_STATUSES.SETTLED) {
        await createPaymentSnapshot({
          tx,
          paymentIntent: updatedIntent,
          invoice,
          appointment: updatedIntent.appointment
        });
      }
    }

    if ([PAYMENT_STATUSES.REFUNDED, PAYMENT_STATUSES.PARTIAL_REFUND].includes(newStatus)) {
      await recordLedgerEntryIfMissing({
        paymentIntentId: intent.id,
        entryType: 'refund',
        status: newStatus,
        amount: updatedIntent.amount,
        metadata: mergedProviderResponse
      }, tx);

      await recordFinancialEntry({
        tx,
        paymentIntent: updatedIntent,
        appointment: updatedIntent.appointment,
        entryType: 'refund',
        status: newStatus,
        direction: 'debit',
        amount: updatedIntent.amount,
        source: updatedIntent.provider || 'midtrans',
        metadata: mergedProviderResponse
      });

      await tx.invoice.updateMany({
        where: { paymentIntentId: updatedIntent.id },
        data: { status: newStatus }
      }).catch(() => null);
    }

    return {
      paymentIntent: updatedIntent,
      appointmentStatus,
      appointment,
      noOp: false
    };
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
