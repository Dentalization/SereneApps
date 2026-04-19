import { PrismaClient } from '@prisma/client';
import { queueNotificationEvent } from '../../notifications/index.js';

const prisma = new PrismaClient();

// Stub: Provision Twilio Conversation internally (defined fully in Sprint 2)
async function provisionConversationForAppointment(appointmentId) {
  console.log(`[Stub] Provisioning conversation for appointment ${appointmentId}`);
  return Promise.resolve();
}

export async function handlePaymentSettled(event) {
  const { correlationId } = event;
  
  // Safe parsing considering it sits formatted internally as JSON
  const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const { appointmentId, provider, providerOrderId, grossAmount } = payload;

  const apptIdBigInt = BigInt(appointmentId);

  await prisma.$transaction(async (tx) => {
    // 1. Load appointment
    const appointment = await tx.appointment.findUnique({
      where: { id: apptIdBigInt }
    });

    if (!appointment) {
      throw { code: 'APPOINTMENT_NOT_FOUND', message: `Appointment ${appointmentId} not found` };
    }

    // 2. Idempotent escape hatch safely returning if double-event occurs
    if (appointment.status === 'confirmed') {
      console.log(`[handlePaymentSettled] Appointment ${appointmentId} already confirmed, skipping. Correlation: ${correlationId}`);
      return;
    }

    // 3. Update appointment
    await tx.appointment.update({
      where: { id: apptIdBigInt },
      data: { status: 'confirmed' }
    });

    // 4. Insert historical boundary tracking
    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: apptIdBigInt,
        status: 'confirmed',
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
  });

  // 6. External async task (provisions Twilio hooks autonomously)
  try {
    await provisionConversationForAppointment(appointmentId);
  } catch (error) {
    console.error(`[handlePaymentSettled] Failed to provision conversation for appointment ${appointmentId}:`, error.message);
  }

  // 8. Log mapping footprint cleanly
  console.log(`[handlePaymentSettled] Successfully processed payment_settled. Correlation: ${correlationId}`);
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
        status: 'payment_failed',
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
