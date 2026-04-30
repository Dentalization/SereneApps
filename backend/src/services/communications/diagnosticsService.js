import { PrismaClient } from '@prisma/client';
import { appointmentScopedRoomName } from './naming.js';
import {
  ensureCommunicationResourcesForAppointment,
  recordCommunicationEvent
} from '../communications.js';

const prisma = new PrismaClient();

const SECRET_KEYS = [
  'token',
  'jwt',
  'secret',
  'authToken',
  'apiKey',
  'apiKeySecret',
  'otp',
  'code',
  'inviteToken',
  'inviteTokenHash'
];

function toBigInt(value, fieldName = 'id') {
  try {
    return BigInt(value);
  } catch (_) {
    const error = new Error(`INVALID_${fieldName.toUpperCase()}`);
    error.status = 400;
    throw error;
  }
}

function asString(value) {
  return value?.toString?.() ?? null;
}

export function redactDiagnosticsMetadata(value) {
  if (Array.isArray(value)) return value.map(redactDiagnosticsMetadata);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      const lowered = key.toLowerCase();
      const shouldRedact = SECRET_KEYS.some((secretKey) => lowered.includes(secretKey.toLowerCase()));
      return [key, shouldRedact ? '[redacted]' : redactDiagnosticsMetadata(item)];
    })
  );
}

function serializeParticipant(participant) {
  return {
    id: participant.id,
    userId: asString(participant.userId),
    displayName: participant.displayName,
    role: participant.role,
    status: participant.status,
    invitedAt: participant.invitedAt,
    verifiedAt: participant.verifiedAt,
    joinedAt: participant.joinedAt,
    expiresAt: participant.expiresAt
  };
}

function serializeEvent(event) {
  return {
    id: event.id.toString(),
    appointmentId: event.appointmentId.toString(),
    actorUserId: asString(event.userId),
    actorRole: event.actorRole,
    eventType: event.eventType,
    provider: event.provider,
    providerSid: event.providerSid || event.resourceSid,
    providerEventId: event.providerEventId,
    occurredAt: event.occurredAt,
    metadata: redactDiagnosticsMetadata(event.metadata || {})
  };
}

function detectInconsistencies({ appointment, projection }) {
  const expectedName = appointmentScopedRoomName(appointment.id);
  const issues = [];
  if (appointment.chatRoom?.channelName && appointment.chatRoom.channelName !== expectedName) {
    issues.push({
      severity: 'error',
      code: 'chat_room_name_mismatch',
      message: 'Local chat room channel does not match appointment-scoped room naming.'
    });
  }
  if (appointment.videoRoomRef && appointment.videoRoomRef !== expectedName) {
    issues.push({
      severity: 'error',
      code: 'video_room_name_mismatch',
      message: 'Video room reference does not match appointment-scoped room naming.'
    });
  }
  if (appointment.commStatus === 'ready' && !appointment.chatRoom?.twilio_conversation_sid) {
    issues.push({
      severity: 'warning',
      code: 'missing_conversation_sid',
      message: 'Appointment is marked ready but no Twilio conversation SID is stored.'
    });
  }
  if (appointment.commStatus === 'ready' && !appointment.video_room_sid) {
    issues.push({
      severity: 'warning',
      code: 'missing_video_room_sid',
      message: 'Appointment is marked ready but no Twilio video room SID is stored.'
    });
  }
  if (projection.messagesMissingTwilioSid > 0) {
    issues.push({
      severity: 'warning',
      code: 'messages_missing_twilio_sid',
      message: 'Some local messages are missing a Twilio message SID.'
    });
  }
  if (projection.expiredAttachmentCount > 0) {
    issues.push({
      severity: 'info',
      code: 'expired_attachments_present',
      message: 'Some attachments are past retention and should render as placeholders.'
    });
  }
  return issues;
}

async function getAppointmentOrThrow(appointmentId) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: toBigInt(appointmentId, 'appointmentId') },
    include: {
      chatRoom: true,
      paymentIntents: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      communicationParticipants: {
        orderBy: { createdAt: 'asc' }
      },
      videoSessions: {
        orderBy: { joinedAt: 'desc' },
        take: 20
      }
    }
  });
  if (!appointment) {
    const error = new Error('APPOINTMENT_NOT_FOUND');
    error.status = 404;
    throw error;
  }
  return appointment;
}

export async function getMessageProjectionStatus({ appointmentId }) {
  const appointment = await getAppointmentOrThrow(appointmentId);
  const chatRoomId = appointment.chatRoom?.id;
  const where = chatRoomId ? { chatRoomId } : { id: -1n };
  const now = new Date();

  const [
    localMessageCount,
    twilioSyncedMessageCount,
    messagesMissingTwilioSid,
    attachmentCount,
    expiredAttachmentCount,
    deletedAttachmentCount
  ] = await Promise.all([
    prisma.chatMessage.count({ where }),
    prisma.chatMessage.count({ where: { ...where, twilioMessageSid: { not: null } } }),
    prisma.chatMessage.count({ where: { ...where, twilioMessageSid: null } }),
    prisma.chatMessage.count({ where: { ...where, messageType: 'file' } }),
    prisma.chatMessage.count({
      where: {
        ...where,
        messageType: 'file',
        mediaRetentionUntil: { lt: now }
      }
    }),
    prisma.chatMessage.count({
      where: {
        ...where,
        messageType: 'file',
        OR: [
          { fileUrl: null },
          { metadata: { path: ['deleted'], equals: true } }
        ]
      }
    })
  ]);

  return {
    appointmentId: appointment.id.toString(),
    chatRoomId: asString(chatRoomId),
    conversationSid: appointment.chatRoom?.twilio_conversation_sid || null,
    localMessageCount,
    twilioSyncedMessageCount,
    messagesMissingTwilioSid,
    attachmentCount,
    expiredAttachmentCount,
    deletedAttachmentCount,
    retentionRespected: expiredAttachmentCount === 0,
    sourceOfTruth: 'local_db_chat_messages'
  };
}

export async function getCommunicationTimeline({ appointmentId, limit = 100 }) {
  const apptId = toBigInt(appointmentId, 'appointmentId');
  await prisma.appointment.findUniqueOrThrow({ where: { id: apptId }, select: { id: true } }).catch(() => {
    const error = new Error('APPOINTMENT_NOT_FOUND');
    error.status = 404;
    throw error;
  });
  const events = await prisma.communicationEvent.findMany({
    where: { appointmentId: apptId },
    orderBy: { occurredAt: 'asc' },
    take: Math.min(Number(limit) || 100, 250)
  });
  return {
    appointmentId: apptId.toString(),
    events: events.map(serializeEvent)
  };
}

export async function getAppointmentDiagnostics({ appointmentId }) {
  const appointment = await getAppointmentOrThrow(appointmentId);
  const [projection, timeline, lastReceipts, lastOutbox] = await Promise.all([
    getMessageProjectionStatus({ appointmentId: appointment.id }),
    getCommunicationTimeline({ appointmentId: appointment.id, limit: 50 }),
    prisma.webhookReceipt.findMany({
      where: { provider: { in: ['twilio', 'midtrans'] } },
      orderBy: { receivedAt: 'desc' },
      take: 10
    }),
    prisma.domainEventOutbox.findMany({
      where: {
        OR: [
          { aggregateType: 'appointment', aggregateId: appointment.id.toString() },
          { payload: { path: ['appointmentId'], equals: appointment.id.toString() } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ]);

  const expectedRoomName = appointmentScopedRoomName(appointment.id);
  const latestPayment = appointment.paymentIntents?.[0] || null;

  return {
    appointmentId: appointment.id.toString(),
    expectedRoomName,
    noSecretsDisplayed: true,
    status: {
      appointment: appointment.status,
      payment: latestPayment?.status || 'unknown',
      communications: appointment.commStatus
    },
    readiness: {
      tokenReady: appointment.commStatus === 'ready',
      chatReady: Boolean(appointment.chatRoom?.twilio_conversation_sid),
      videoReady: Boolean(appointment.video_room_sid),
      roomNameStable: appointment.videoRoomRef === expectedRoomName
        && (!appointment.chatRoom?.channelName || appointment.chatRoom.channelName === expectedRoomName)
    },
    resources: {
      chatRoomId: asString(appointment.chatRoom?.id),
      conversationSid: appointment.chatRoom?.twilio_conversation_sid || null,
      chatChannelName: appointment.chatRoom?.channelName || null,
      videoRoomName: appointment.videoRoomRef || null,
      videoRoomSid: appointment.video_room_sid || null
    },
    participants: [
      { role: 'dentist', userId: appointment.dentistId.toString(), status: 'assigned' },
      { role: 'patient', userId: appointment.patientId.toString(), status: 'assigned' },
      ...appointment.communicationParticipants.map(serializeParticipant)
    ],
    projection,
    videoSessions: appointment.videoSessions.map((session) => ({
      id: session.id.toString(),
      userId: asString(session.userId),
      joinedAt: session.joinedAt,
      leftAt: session.leftAt,
      durationSeconds: session.durationSeconds
    })),
    webhookReceipts: lastReceipts.map((receipt) => ({
      id: receipt.id.toString(),
      provider: receipt.provider,
      source: receipt.source,
      eventType: receipt.eventType,
      resourceId: receipt.resourceId,
      status: receipt.status,
      attempts: receipt.attempts,
      receivedAt: receipt.receivedAt,
      processedAt: receipt.processedAt,
      lastError: receipt.lastError
    })),
    outbox: lastOutbox.map((event) => ({
      id: event.id.toString(),
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      status: event.status,
      attempts: event.attempts,
      availableAt: event.availableAt,
      publishedAt: event.publishedAt,
      lastError: event.lastError
    })),
    timeline: timeline.events,
    inconsistencies: detectInconsistencies({ appointment, projection })
  };
}

export async function reconcileAppointmentCommunications({ appointmentId, user }) {
  const appointment = await getAppointmentOrThrow(appointmentId);
  const latestPayment = appointment.paymentIntents?.[0] || null;
  const paymentReady = ['confirmed', 'completed'].includes(appointment.status)
    || ['settled', 'paid', 'capture', 'success'].includes(latestPayment?.status);

  await recordCommunicationEvent({
    appointmentId: appointment.id,
    userId: user?.id || null,
    actorRole: 'admin',
    eventType: 'diagnostics_check_executed',
    metadata: {
      command: 'reconcile',
      paymentReady,
      commStatus: appointment.commStatus
    }
  });

  if (!paymentReady || appointment.status === 'cancelled') {
    return {
      appointmentId: appointment.id.toString(),
      changed: false,
      skipped: true,
      reason: 'appointment_not_safe_for_reconcile',
      diagnostics: await getAppointmentDiagnostics({ appointmentId: appointment.id })
    };
  }

  const resources = await ensureCommunicationResourcesForAppointment({
    appointmentId: appointment.id,
    reason: 'admin_reconcile'
  });

  await recordCommunicationEvent({
    appointmentId: appointment.id,
    userId: user?.id || null,
    actorRole: 'admin',
    eventType: 'diagnostics_reconcile_executed',
    metadata: {
      conversationSid: resources.conversationSid,
      videoRoomSid: resources.videoRoomSid,
      roomName: resources.roomName
    }
  });

  return {
    appointmentId: appointment.id.toString(),
    changed: true,
    skipped: false,
    resources: {
      conversationSid: resources.conversationSid,
      videoRoomSid: resources.videoRoomSid,
      roomName: resources.roomName
    },
    diagnostics: await getAppointmentDiagnostics({ appointmentId: appointment.id })
  };
}

export const __testables = {
  detectInconsistencies,
  redactDiagnosticsMetadata,
  serializeEvent
};
