import { PrismaClient } from '@prisma/client';
import { messaging } from '../../../lib/firebase.js';

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
  });

  // 5. External async task (provisions Twilio hooks autonomously)
  try {
    await provisionConversationForAppointment(appointmentId);
  } catch (error) {
    console.error(`[handlePaymentSettled] Failed to provision conversation for appointment ${appointmentId}:`, error.message);
  }

  // 6 & 7. FCM Push broadcast for Patient & Dentist simultaneously
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: apptIdBigInt },
      select: { patientId: true, dentistId: true }
    });

    if (appointment) {
      const devices = await prisma.notificationDevice.findMany({
        where: {
          userId: { in: [appointment.patientId, appointment.dentistId] }
        }
      });

      const tokens = devices.map(d => d.fcmToken).filter(Boolean);

      if (tokens.length > 0) {
        await messaging.sendEachForMulticast({
          tokens,
          notification: {
            title: 'Janji temu dikonfirmasi',
            body: 'Pembayaran berhasil. Jadwal konsultasi Anda telah terkonfirmasi.'
          },
          data: {
            type: 'appointment_confirmed',
            appointmentId: String(appointmentId)
          }
        });
      }
    }
  } catch (error) {
    console.warn(`[handlePaymentSettled] Failed to send push notification for appointment ${appointmentId}:`, error.message);
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
  });

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: apptIdBigInt },
      select: { patientId: true }
    });

    if (appointment) {
      const devices = await prisma.notificationDevice.findMany({
        where: { userId: appointment.patientId }
      });
      const tokens = devices.map(d => d.fcmToken).filter(Boolean);

      if (tokens.length > 0) {
        await messaging.sendEachForMulticast({
          tokens,
          notification: {
            title: 'Pembayaran gagal',
            body: 'Silakan coba lagi atau gunakan metode pembayaran lain.'
          },
          data: {
             type: 'payment_failed',
             appointmentId: String(appointmentId)
          }
        });
      }
    }
  } catch (error) {
    console.warn(`[handlePaymentFailed] Failed to send push notification:`, error.message);
  }

  console.log(`[handlePaymentFailed] Successfully processed payment_failed. Correlation: ${correlationId}`);
}
