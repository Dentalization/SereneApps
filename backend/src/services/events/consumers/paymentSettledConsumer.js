import { PrismaClient } from '@prisma/client';
import { queueNotificationEvent } from '../../notifications/index.js';
import { ensureCommunicationResourcesForAppointment } from '../../communications.js';
import { logCommunicationEvent } from '../../communications/logging.js';

const prisma = new PrismaClient();

export async function handlePaymentSettled(event) {
  const { correlationId } = event;
  
  // Safe parsing considering it sits formatted internally as JSON
  const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const { appointmentId, provider, providerOrderId, grossAmount } = payload;

  const apptIdBigInt = BigInt(appointmentId);

  const transactionResult = await prisma.$transaction(async (tx) => {
    // 1. Load appointment
    const appointment = await tx.appointment.findUnique({
      where: { id: apptIdBigInt }
    });

    if (!appointment) {
      throw { code: 'APPOINTMENT_NOT_FOUND', message: `Appointment ${appointmentId} not found` };
    }

    if (appointment.status === 'confirmed' && appointment.commStatus === 'ready') {
      logCommunicationEvent('payment_settled_skip_ready', {
        appointmentId,
        correlationId
      });
      return { alreadyReady: true };
    }

    if (appointment.status !== 'confirmed') {
      // 3. Update appointment
      await tx.appointment.update({
        where: { id: apptIdBigInt },
        data: { status: 'confirmed' }
      });

      // 4. Insert historical boundary tracking
      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: apptIdBigInt,
          previousStatus: appointment.status,
          newStatus: 'confirmed',
          reason: 'payment_settled',
          metadata: {
            correlationId,
            provider,
            providerOrderId,
            grossAmount
          }
        }
      });

      // 5. Queue Notification Event inside transaction for consistency (optional, but safer)
      await queueNotificationEvent({
        eventType: 'appointment_confirmed',
        appointmentId: apptIdBigInt,
        payload: {
          amount: grossAmount,
          provider
        }
      }).catch(err => console.error(`[handlePaymentSettled] Notification queuing failed:`, err.message));
    }

    return { alreadyReady: false };
  });

  if (!transactionResult?.alreadyReady) {
    await ensureCommunicationResourcesForAppointment({
      appointmentId,
      reason: 'payment_settled'
    });
  }

  // 8. Log mapping footprint cleanly
  logCommunicationEvent('payment_settled_processed', {
    appointmentId,
    correlationId,
    provider,
    providerOrderId
  });
}

export async function handlePaymentFailed(event) {
  const { correlationId } = event;
  const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const { appointmentId } = payload;
  const apptIdBigInt = BigInt(appointmentId);

  await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({
      where: { id: apptIdBigInt }
    });

    if (!appointment) {
      throw { code: 'APPOINTMENT_NOT_FOUND', message: `Appointment ${appointmentId} not found` };
    }

    if (appointment.status === 'payment_failed') {
      console.log(`[handlePaymentFailed] Appointment ${appointmentId} already in failed status, skipping. Correlation: ${correlationId}`);
      return;
    }

    await tx.appointment.update({
      where: { id: apptIdBigInt },
      data: { status: 'payment_failed' }
    });

    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: apptIdBigInt,
        previousStatus: appointment.status,
        newStatus: 'payment_failed',
        reason: 'payment_failed',
        metadata: { correlationId }
      }
    });

    // Queue failure notification
    await queueNotificationEvent({
      eventType: 'appointment_payment_failed',
      appointmentId: apptIdBigInt,
      payload: { correlationId }
    }).catch(err => console.error(`[handlePaymentFailed] Notification queuing failed:`, err.message));
  });

  console.log(`[handlePaymentFailed] Successfully processed payment_failed. Correlation: ${correlationId}`);
}
