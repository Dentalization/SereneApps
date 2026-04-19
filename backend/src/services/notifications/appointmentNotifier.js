import { queueNotificationEvent } from './index.js';

/**
 * Service specifically for appointment-related notification orchestrations.
 * This extends the basic queueNotificationEvent with appointment-specific logic.
 */

export async function notifyAppointmentConfirmed(appointmentId, payload = {}) {
  return queueNotificationEvent({
    eventType: 'appointment_confirmed',
    appointmentId,
    payload
  });
}

export async function notifyAppointmentCancelled(appointmentId, payload = {}) {
  return queueNotificationEvent({
    eventType: 'appointment_cancelled',
    appointmentId,
    payload
  });
}

export async function notifyAppointmentReminder(appointmentId, payload = {}) {
  return queueNotificationEvent({
    eventType: 'appointment_reminder',
    appointmentId,
    payload
  });
}

export async function notifyPaymentFailed(appointmentId, payload = {}) {
  return queueNotificationEvent({
    eventType: 'appointment_payment_failed',
    appointmentId,
    payload
  });
}

export default {
  notifyAppointmentConfirmed,
  notifyAppointmentCancelled,
  notifyAppointmentReminder,
  notifyPaymentFailed
};
