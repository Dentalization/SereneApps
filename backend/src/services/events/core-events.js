import { randomUUID } from 'crypto';

export const INTERNAL_EVENTS = Object.freeze({
  APPOINTMENT_CREATED: 'appointment_created',
  APPOINTMENT_PAYMENT_PENDING: 'appointment_payment_pending',
  PAYMENT_SNAP_CREATED: 'payment_snap_created',
  PAYMENT_STATUS_CHANGED: 'payment_status_changed',
  PAYMENT_SETTLED: 'payment_settled',
  PAYMENT_FAILED: 'payment_failed',
  CHAT_CONVERSATION_PROVISIONED: 'chat_conversation_provisioned',
  CHAT_MESSAGE_CREATED: 'chat_message_created',
  MESSAGE_READ: 'message_read',
  VIDEO_ROOM_PROVISIONED: 'video_room_provisioned',
  CONSULTATION_STARTED: 'consultation_started',
  CONSULTATION_ENDED: 'consultation_ended',
  OTP_REQUESTED: 'otp_requested',
  OTP_VERIFIED: 'otp_verified',
  PUSH_NOTIFICATION_REQUESTED: 'push_notification_requested',
  AI_RESULT_READY: 'ai_result_ready'
});

export const EVENT_PRODUCERS = Object.freeze({
  appointment_created: 'appointments',
  appointment_payment_pending: 'payments',
  payment_snap_created: 'payments',
  payment_status_changed: 'payments.webhook',
  payment_settled: 'payments.webhook',
  payment_failed: 'payments.webhook',
  chat_conversation_provisioned: 'communications',
  chat_message_created: 'communications',
  message_read: 'communications',
  video_room_provisioned: 'communications',
  consultation_started: 'communications',
  consultation_ended: 'communications',
  otp_requested: 'auth.otp',
  otp_verified: 'auth.otp',
  push_notification_requested: 'notifications',
  ai_result_ready: 'ai'
});

export const EVENT_CONSUMERS = Object.freeze({
  appointment_created: ['payments', 'communications', 'notifications'],
  appointment_payment_pending: ['payments', 'notifications'],
  payment_snap_created: ['notifications'],
  payment_status_changed: ['appointments', 'notifications', 'analytics'],
  payment_settled: ['appointments', 'communications', 'notifications'],
  payment_failed: ['appointments', 'notifications'],
  chat_conversation_provisioned: ['notifications', 'mobile-sync'],
  chat_message_created: ['notifications', 'analytics'],
  message_read: ['mobile-sync', 'analytics'],
  video_room_provisioned: ['mobile-sync', 'notifications'],
  consultation_started: ['analytics'],
  consultation_ended: ['analytics', 'follow-up'],
  otp_requested: ['security-audit'],
  otp_verified: ['auth', 'security-audit'],
  push_notification_requested: ['notifications'],
  ai_result_ready: ['notifications', 'patient-timeline']
});

export function buildEventEnvelope({
  eventType,
  aggregateType,
  aggregateId,
  correlationId,
  causationId,
  idempotencyKey,
  payload = {},
  headers = {},
  occurredAt = new Date().toISOString()
}) {
  if (!eventType) {
    throw new Error('EVENT_TYPE_REQUIRED');
  }
  if (!aggregateType) {
    throw new Error('AGGREGATE_TYPE_REQUIRED');
  }
  if (!aggregateId) {
    throw new Error('AGGREGATE_ID_REQUIRED');
  }

  return {
    eventId: randomUUID(),
    eventType,
    aggregateType,
    aggregateId: aggregateId.toString(),
    correlationId: correlationId || randomUUID(),
    causationId: causationId || null,
    idempotencyKey: idempotencyKey || null,
    occurredAt,
    producer: EVENT_PRODUCERS[eventType] || 'unknown',
    payload,
    headers
  };
}
