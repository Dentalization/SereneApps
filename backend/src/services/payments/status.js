import { PrismaClient } from '@prisma/client';
import { ensureChatRoom, ensureVideoChannel, emitAppointmentEvent } from '../communications.js';
import { queueNotificationEvent } from '../notifications/index.js';

const prisma = new PrismaClient();

export const VALID_PAYMENT_STATUSES = ['pending', 'requires_action', 'authorized', 'succeeded', 'failed', 'cancelled'];
export const FINAL_PAYMENT_STATUSES = ['succeeded', 'failed', 'cancelled'];

const appointmentSelect = {
  id: true,
  dentistId: true,
  patientId: true,
  status: true,
  chatRoomRef: true,
  videoRoomRef: true,
  commStatus: true
};

function mapStatusToAppointment(status) {
  switch (status) {
    case 'succeeded':
      return 'confirmed';
    case 'failed':
      return 'payment_failed';
    case 'cancelled':
      return 'cancelled';
    default:
      return null;
  }
}

function mapStatusToEvent(status) {
  switch (status) {
    case 'succeeded':
      return 'appointment_confirmed';
    case 'failed':
      return 'appointment_payment_failed';
    case 'cancelled':
      return 'appointment_cancelled';
    default:
      return 'payment_status_updated';
  }
}

async function syncCommunications(appointment, status) {
  if (!appointment) return null;
  const appointmentId = appointment.id;

  if (status === 'confirmed') {
    const { room } = await ensureChatRoom({ appointmentId });
    const videoRoom = await ensureVideoChannel({ appointmentId });
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        chatRoomRef: room.channelName,
        videoRoomRef: videoRoom.channelName,
        commStatus: 'ready'
      }
    }).catch(() => null);

    await queueNotificationEvent({
      eventType: 'chat_invite',
      appointmentId,
      payload: {
        roomName: room.channelName
      }
    }).catch((error) => {
      console.error('Chat invite notification error:', error);
    });

    return { chatRoomRef: room.channelName, videoRoomRef: videoRoom.channelName };
  }

  if (['payment_failed', 'cancelled'].includes(status)) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { commStatus: 'cancelled' }
    }).catch(() => null);
  }

  return null;
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

    if (FINAL_PAYMENT_STATUSES.includes(intent.status) && intent.status !== newStatus) {
      const error = new Error('PAYMENT_ALREADY_FINAL');
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
          : intent.metadata
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

    if (FINAL_PAYMENT_STATUSES.includes(newStatus)) {
      await tx.paymentLedger.create({
        data: {
          paymentIntentId: intent.id,
          entryType: 'charge',
          status: newStatus,
          amount: updatedIntent.amount,
          metadata: mergedProviderResponse
        }
      });
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
