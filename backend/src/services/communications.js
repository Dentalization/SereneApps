import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';
import { buildTwilioVideoToken } from './twilioVideo.js';
import { queueNotificationEvent } from './notifications/index.js';
import ConversationsAdapter from './communications/conversationsAdapter.js';
import VideoService from './communications/videoService.js';
import { getConversationsServiceSid, getTwilioStandardKeyConfig } from './communications/config.js';
import {
  appointmentScopedRoomName,
  chatChannelNameForAppointment,
  videoRoomNameForAppointment
} from './communications/naming.js';
import { logCommunicationEvent } from './communications/logging.js';
import { attachmentPresentationForMessage } from './communications/attachmentStorageService.js';
import { evaluateClinicObserverAccess } from './clinicAuthorizationPolicyService.js';

const prisma = new PrismaClient();
const OBSERVER_TOKEN_MAX_TTL_SECONDS = 900;

let conversationsAdapter;
let videoService;

function getConversationsAdapter() {
  if (!conversationsAdapter) conversationsAdapter = new ConversationsAdapter();
  return conversationsAdapter;
}

function getVideoService() {
  if (!videoService) videoService = new VideoService();
  return videoService;
}

function isTransientTwilioError(error) {
  const status = Number(error?.status || error?.statusCode);
  const code = Number(error?.code || error?.twilioCode);
  return status === 429 || status >= 500 || code === 20429;
}

async function withTwilioRetry(operation, { attempts = 3, label = 'twilio_operation', appointmentId } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientTwilioError(error)) {
        throw error;
      }
      const delayMs = Math.min(250 * (2 ** (attempt - 1)), 2000);
      logCommunicationEvent('provisioning_retry', {
        appointmentId,
        label,
        attempt,
        delayMs,
        error: error.message
      }, 'warn');
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function userCanAccessAppointment(user, appointment) {
  const userId = BigInt(user.id);
  const roles = user.roles || [];
  const invitedParticipant = (appointment.communicationParticipants || []).some((participant) => (
    participant.userId === userId && ['verified', 'joined'].includes(participant.status)
  ));
  return (
    roles.includes('admin')
    || roles.includes('super_admin')
    || userId === appointment.dentistId
    || userId === appointment.patientId
    || invitedParticipant
  );
}

export function normalizeCommunicationTokenMode(input = {}) {
  const role = String(input.role || '').toLowerCase();
  const mode = String(input.mode || '').toLowerCase();
  return role === 'observer' || mode === 'observer' ? 'observer' : null;
}

export function clampCommunicationTokenTtl({ ttl = 3600, mode = null } = {}) {
  const parsed = Number.parseInt(ttl, 10);
  const safeTtl = Number.isFinite(parsed) && parsed > 0 ? parsed : 3600;
  return mode === 'observer'
    ? Math.min(safeTtl, OBSERVER_TOKEN_MAX_TTL_SECONDS)
    : safeTtl;
}

export function communicationActorRoleForAppointment(user, appointment) {
  if (!user || !appointment) return null;
  const roles = user.roles || [];
  const userId = BigInt(user.id);
  if (userId === appointment.dentistId) return 'dentist';
  if (userId === appointment.patientId) return 'patient';
  const invitedParticipant = (appointment.communicationParticipants || []).find((participant) => (
    participant.userId === userId && ['verified', 'joined'].includes(participant.status)
  ));
  if (invitedParticipant) return invitedParticipant.role;
  if (roles.includes('admin') || roles.includes('super_admin')) return 'admin';
  if (roles.includes('technical_support')) return 'support';
  return roles[0] || null;
}

function serializeMessage(msg, appointmentId) {
  const attachment = attachmentPresentationForMessage(msg);
  return {
    id: msg.id.toString(),
    chatRoomId: msg.chatRoomId.toString(),
    senderId: msg.senderId?.toString?.() ?? null,
    senderParticipantId: msg.senderCommunicationParticipantId || null,
    appointmentId: appointmentId?.toString?.() ?? undefined,
    message: msg.message,
    messageType: msg.messageType,
    twilioMessageSid: msg.twilioMessageSid,
    fileUrl: attachment.fileUrl,
    fileName: msg.fileName,
    mimeType: msg.mimeType,
    fileSizeBytes: msg.fileSizeBytes?.toString?.() ?? null,
    mediaRetentionUntil: msg.mediaRetentionUntil,
    storageProvider: msg.storageProvider || msg.metadata?.storage || null,
    mediaScanStatus: msg.mediaScanStatus || msg.metadata?.scanStatus || null,
    mediaDeletedAt: msg.mediaDeletedAt,
    mediaTombstoneReason: attachment.tombstoneReason,
    attachmentAvailable: attachment.attachmentAvailable,
    metadata: msg.metadata || {},
    createdAt: msg.createdAt,
    sender: msg.sender
      ? {
          id: msg.sender.id.toString(),
          name: msg.sender.name,
          email: msg.sender.email,
          avatar: msg.sender.avatar_url
        }
      : msg.senderCommunicationParticipant
        ? {
            id: msg.senderCommunicationParticipant.id,
            name: msg.senderCommunicationParticipant.displayName,
            email: msg.senderCommunicationParticipant.email,
            role: msg.senderCommunicationParticipant.role,
            participantId: msg.senderCommunicationParticipant.id
          }
      : null
  };
}

function sanitizeEventMetadata(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      code: value.code
    };
  }
  if (Array.isArray(value)) return value.map(sanitizeEventMetadata);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => {
        const lowered = key.toLowerCase();
        return !lowered.includes('token')
          && !lowered.includes('secret')
          && !lowered.includes('otp')
          && lowered !== 'code';
      })
      .map(([key, item]) => [key, sanitizeEventMetadata(item)])
  );
}

export async function recordCommunicationEvent({
  appointmentId,
  userId = null,
  actorRole = null,
  eventType,
  provider = null,
  providerEventId = null,
  resourceSid = null,
  providerSid = null,
  metadata = {},
  occurredAt = new Date()
}) {
  if (!eventType) return null;

  const data = {
    appointmentId: BigInt(appointmentId),
    userId: userId ? BigInt(userId) : null,
    actorRole,
    eventType,
    provider,
    providerEventId,
    resourceSid,
    providerSid: providerSid || resourceSid,
    metadata: sanitizeEventMetadata(metadata || {}),
    occurredAt
  };

  try {
    if (provider && providerEventId) {
      return await prisma.communicationEvent.upsert({
        where: {
          provider_providerEventId: {
            provider,
            providerEventId
        }
      },
        update: { metadata: data.metadata, actorRole, providerSid: providerSid || resourceSid },
        create: data
      });
    }

    return await prisma.communicationEvent.create({ data });
  } catch (error) {
    logCommunicationEvent('audit_event_write_failed', {
      appointmentId,
      eventType,
      provider,
      providerEventId,
      error: error.message
    }, 'warn');
    return null;
  }
}

async function ensureChatRoomMembers(room, appointment, client = prisma) {
  if (!appointment) return;
  const now = new Date();

  await client.chatRoomMember.upsert({
    where: {
      chatRoomId_userId: {
        chatRoomId: room.id,
        userId: appointment.dentistId
      }
    },
    update: { role: 'dentist' },
    create: {
      chatRoomId: room.id,
      userId: appointment.dentistId,
      role: 'dentist',
      lastReadAt: now
    }
  });

  await client.chatRoomMember.upsert({
    where: {
      chatRoomId_userId: {
        chatRoomId: room.id,
        userId: appointment.patientId
      }
    },
    update: { role: 'patient' },
    create: {
      chatRoomId: room.id,
      userId: appointment.patientId,
      role: 'patient',
      lastReadAt: now
    }
  });
}

export async function getAppointmentForAuthorizedUser({ appointmentId, user, requestedRole = null }) {
  const apptId = BigInt(appointmentId);
  const appointment = await prisma.appointment.findUnique({
    where: { id: apptId },
    include: {
      chatRoom: { include: { members: true } },
      patient: { select: { id: true, name: true, email: true } },
      dentist: { select: { id: true, name: true, email: true } },
      clinicBranch: { select: { id: true, clinicProfileId: true } },
      communicationParticipants: {
        select: { id: true, userId: true, role: true, status: true }
      }
    }
  });

  if (!appointment) {
    const error = new Error('APPOINTMENT_NOT_FOUND');
    error.status = 404;
    throw error;
  }

  const isObserverRequest = requestedRole === 'observer';
  const observerAccess = isObserverRequest
    ? await evaluateClinicObserverAccess(user, appointment)
    : { allowed: false, reason: null };
  const canAccess = isObserverRequest
    ? observerAccess.allowed
    : userCanAccessAppointment(user, appointment);

  if (!canAccess) {
    if (isObserverRequest) {
      await recordCommunicationEvent({
        appointmentId: apptId,
        userId: user.id,
        actorRole: 'observer',
        eventType: 'clinic_observer_denied',
        provider: 'api',
        metadata: {
          reason: observerAccess.reason || 'clinic_observer_denied',
          clinicStaffId: observerAccess.staffId || null,
          roomName: appointmentScopedRoomName(apptId)
        }
      }).catch(() => null);
      logCommunicationEvent('clinic_observer_denied', {
        appointmentId: apptId,
        userId: user.id,
        reason: observerAccess.reason || 'clinic_observer_denied'
      }, 'warn');
    }
    logCommunicationEvent('permission_denied', {
      appointmentId: apptId,
      userId: user.id,
      action: isObserverRequest ? 'clinic_observer_token_access' : 'appointment_communications_access'
    }, 'warn');
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }

  return appointment;
}

export async function ensureChatRoom({ appointmentId }) {
  const apptId = BigInt(appointmentId);
  const channelName = chatChannelNameForAppointment(apptId);
  const appointment = await prisma.appointment.findUnique({
    where: { id: apptId },
    include: {
      patient: { select: { id: true, name: true, email: true } },
      dentist: { select: { id: true, name: true, email: true } }
    }
  });

  if (!appointment) {
    throw new Error('APPOINTMENT_NOT_FOUND');
  }

  const room = await prisma.chatRoom.upsert({
    where: { appointmentId: apptId },
    update: { channelName },
    create: {
      appointmentId: apptId,
      channelName
    }
  });

  await prisma.appointment.update({
    where: { id: apptId },
    data: { chatRoomRef: channelName }
  }).catch(() => null);

  await ensureChatRoomMembers(room, appointment);

  return { room, appointment };
}

export async function ensureConversationForAppointment({ appointmentId, reason = 'ensure' }) {
  const apptId = BigInt(appointmentId);
  const { room, appointment } = await ensureChatRoom({ appointmentId: apptId });
  const adapter = getConversationsAdapter();
  const uniqueName = appointmentScopedRoomName(apptId);

  if (room.twilio_conversation_sid) {
    return {
      appointment,
      room,
      conversationSid: room.twilio_conversation_sid,
      uniqueName
    };
  }

  const { sid: conversationSid } = await withTwilioRetry(
    () => adapter.createConversation({
      uniqueName,
      friendlyName: `Appointment ${apptId}`
    }),
    { appointmentId: apptId, label: 'create_conversation' }
  );

  await Promise.all([
    withTwilioRetry(
      () => adapter.addParticipant({
        conversationSid,
        identity: appointment.patientId.toString(),
        friendlyName: appointment.patient?.name || `Patient ${appointment.patientId}`
      }),
      { appointmentId: apptId, label: 'add_patient_participant' }
    ),
    withTwilioRetry(
      () => adapter.addParticipant({
        conversationSid,
        identity: appointment.dentistId.toString(),
        friendlyName: appointment.dentist?.name || `Dentist ${appointment.dentistId}`
      }),
      { appointmentId: apptId, label: 'add_dentist_participant' }
    )
  ]);

  const updatedRoom = await prisma.chatRoom.update({
    where: { id: room.id },
    data: {
      twilio_conversation_sid: conversationSid,
      channelName: uniqueName
    }
  });

  await prisma.appointment.update({
    where: { id: apptId },
    data: { chatRoomRef: uniqueName }
  }).catch(() => null);

  await recordCommunicationEvent({
    appointmentId: apptId,
    eventType: 'conversation_provisioned',
    provider: 'twilio-conversations',
    providerEventId: conversationSid,
    resourceSid: conversationSid,
    metadata: { reason, uniqueName }
  });

  logCommunicationEvent('conversation_provisioned', {
    appointmentId: apptId,
    conversationSid,
    uniqueName,
    reason
  });

  return {
    appointment,
    room: updatedRoom,
    conversationSid,
    uniqueName
  };
}

export async function ensureVideoChannel({ appointmentId }) {
  const apptId = BigInt(appointmentId);
  const roomName = videoRoomNameForAppointment(apptId);
  const video = await withTwilioRetry(
    () => getVideoService().ensureRoom(apptId),
    { appointmentId: apptId, label: 'ensure_video_room' }
  );

  await prisma.appointment.update({
    where: { id: apptId },
    data: {
      videoRoomRef: roomName,
      video_room_sid: video.roomSid
    }
  });

  await recordCommunicationEvent({
    appointmentId: apptId,
    eventType: 'video_room_provisioned',
    provider: 'twilio-video',
    providerEventId: video.roomSid,
    resourceSid: video.roomSid,
    metadata: { roomName }
  });

  return { channelName: roomName, roomName, roomSid: video.roomSid };
}

export async function ensureCommunicationResourcesForAppointment({ appointmentId, reason = 'ensure' }) {
  const apptId = BigInt(appointmentId);

  try {
    const conversation = await ensureConversationForAppointment({ appointmentId: apptId, reason });
    const video = await ensureVideoChannel({ appointmentId: apptId });

    await prisma.appointment.update({
      where: { id: apptId },
      data: {
        chatRoomRef: conversation.uniqueName,
        videoRoomRef: video.roomName,
        video_room_sid: video.roomSid,
        commStatus: 'ready'
      }
    });

    await recordCommunicationEvent({
      appointmentId: apptId,
      eventType: 'communications_ready',
      metadata: {
        reason,
        conversationSid: conversation.conversationSid,
        videoRoomSid: video.roomSid,
        roomName: video.roomName
      }
    });

    return {
      appointment: conversation.appointment,
      chatRoom: conversation.room,
      conversationSid: conversation.conversationSid,
      roomName: video.roomName,
      videoRoomSid: video.roomSid,
      commStatus: 'ready'
    };
  } catch (error) {
    await prisma.appointment.update({
      where: { id: apptId },
      data: { commStatus: 'provisioning_failed' }
    }).catch(() => null);
    logCommunicationEvent('provisioning_failed', {
      appointmentId: apptId,
      reason,
      error: error.message,
      code: error.code
    }, 'error');
    throw error;
  }
}

export async function addConversationParticipantForIdentity({
  appointmentId,
  identity,
  friendlyName,
  reason = 'participant_access'
}) {
  const resources = await ensureCommunicationResourcesForAppointment({ appointmentId, reason });
  await withTwilioRetry(
    () => getConversationsAdapter().addParticipant({
      conversationSid: resources.conversationSid,
      identity,
      friendlyName
    }),
    { appointmentId: resources.appointment.id, label: 'add_external_participant' }
  );
  return resources;
}

export async function removeConversationParticipantForIdentity({
  appointmentId,
  identity,
  reason = 'participant_removed'
}) {
  const apptId = BigInt(appointmentId);
  const room = await prisma.chatRoom.findUnique({
    where: { appointmentId: apptId },
    select: { twilio_conversation_sid: true }
  });
  if (!room?.twilio_conversation_sid || !identity) {
    return { removed: false, reason: 'conversation_not_ready' };
  }

  const result = await withTwilioRetry(
    () => getConversationsAdapter().removeParticipant({
      conversationSid: room.twilio_conversation_sid,
      identity
    }),
    { appointmentId: apptId, label: 'remove_external_participant' }
  );

  logCommunicationEvent('participant_conversation_removed', {
    appointmentId: apptId,
    identity,
    removed: result?.removed || false,
    reason
  });

  return result || { removed: false };
}

export async function disconnectVideoParticipantForIdentity({
  appointmentId,
  identity,
  reason = 'participant_removed'
}) {
  const apptId = BigInt(appointmentId);
  const appointment = await prisma.appointment.findUnique({
    where: { id: apptId },
    select: { video_room_sid: true, videoRoomRef: true }
  });
  if (!appointment?.video_room_sid || !identity) {
    return { disconnected: false, reason: 'video_room_not_ready' };
  }

  const result = await withTwilioRetry(
    () => getVideoService().disconnectParticipant({
      roomSid: appointment.video_room_sid,
      identity
    }),
    { appointmentId: apptId, label: 'disconnect_video_participant' }
  );

  logCommunicationEvent('participant_video_disconnected', {
    appointmentId: apptId,
    identity,
    roomName: appointment.videoRoomRef,
    disconnected: result?.disconnected || false,
    reason
  });

  return result || { disconnected: false };
}

export async function hardEndAppointmentConsultationRoom({ appointmentId, user }) {
  const appointment = await getAppointmentForAuthorizedUser({ appointmentId, user });
  const actorRole = communicationActorRoleForAppointment(user, appointment);
  const canEnd = actorRole === 'dentist' || actorRole === 'admin';
  if (!canEnd) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }

  const result = appointment.video_room_sid
    ? await withTwilioRetry(
        () => getVideoService().completeRoom(appointment.video_room_sid),
        { appointmentId: appointment.id, label: 'hard_end_video_room' }
      )
    : { ended: false, reason: 'video_room_not_ready' };

  if (appointment.status === 'confirmed') {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'completed' }
    }).catch(() => null);
  }

  await recordCommunicationEvent({
    appointmentId: appointment.id,
    userId: user.id,
    actorRole,
    eventType: 'consultation_room_hard_ended',
    provider: 'twilio-video',
    resourceSid: appointment.video_room_sid || null,
    metadata: {
      roomName: appointment.videoRoomRef,
      ended: result.ended || false,
      reason: result.reason || 'moderator_control'
    }
  });

  return {
    appointmentId: appointment.id.toString(),
    roomName: appointment.videoRoomRef,
    roomSid: appointment.video_room_sid,
    ended: result.ended || false
  };
}

export async function saveChatMessage({
  appointmentId,
  senderId,
  message,
  messageType = 'text',
  fileUrl,
  fileName,
  mimeType,
  fileSizeBytes,
  storageProvider,
  storageBucket,
  storageObjectKey,
  mediaRetentionUntil,
  mediaScanStatus,
  metadata = {}
}) {
  const apptId = BigInt(appointmentId);
  const userId = BigInt(senderId);

  const appointment = await prisma.appointment.findUnique({
    where: { id: apptId },
    select: {
      id: true,
      dentistId: true,
      patientId: true,
      communicationParticipants: {
        select: { userId: true, status: true }
      }
    }
  });
  if (!appointment) {
    throw new Error('APPOINTMENT_NOT_FOUND');
  }
  const isInvitedLinkedParticipant = appointment.communicationParticipants.some((participant) => (
    participant.userId === userId && ['verified', 'joined'].includes(participant.status)
  ));
  if (userId !== appointment.dentistId && userId !== appointment.patientId && !isInvitedLinkedParticipant) {
    throw new Error('FORBIDDEN');
  }

  const { room, conversationSid } = await ensureConversationForAppointment({
    appointmentId: apptId,
    reason: 'send_message'
  });

  const messageAttributes = {
    ...(metadata || {}),
    type: messageType,
    appointmentId: apptId.toString(),
    fileUrl,
    fileName,
    mimeType,
    fileSizeBytes,
    storageProvider,
    storageBucket,
    storageObjectKey,
    mediaRetentionUntil,
    mediaScanStatus
  };

  const sent = await withTwilioRetry(
    () => getConversationsAdapter().sendMessage({
      conversationSid,
      author: userId.toString(),
      body: message,
      attributes: messageAttributes
    }),
    { appointmentId: apptId, label: 'send_conversation_message' }
  );

  const fileSizeBigInt = fileSizeBytes === undefined || fileSizeBytes === null ? null : BigInt(fileSizeBytes);
  const newMessage = await prisma.chatMessage.upsert({
    where: { twilioMessageSid: sent.messageSid },
    update: {
      message,
      messageType,
      fileUrl,
      fileName,
      mimeType,
      fileSizeBytes: fileSizeBigInt,
      storageProvider,
      storageBucket,
      storageObjectKey,
      mediaRetentionUntil,
      mediaScanStatus,
      metadata: messageAttributes
    },
    create: {
      chatRoomId: room.id,
      senderId: userId,
      message,
      messageType,
      twilioMessageSid: sent.messageSid,
      createdAt: sent.dateCreated ? new Date(sent.dateCreated) : new Date(),
      fileUrl,
      fileName,
      mimeType,
      fileSizeBytes: fileSizeBigInt,
      storageProvider,
      storageBucket,
      storageObjectKey,
      mediaRetentionUntil,
      mediaScanStatus,
      metadata: messageAttributes
    },
    include: {
      sender: {
        select: { id: true, name: true, email: true, avatar_url: true }
      },
      senderCommunicationParticipant: {
        select: { id: true, displayName: true, email: true, role: true }
      }
    }
  });

  await prisma.appointment.update({
    where: { id: apptId },
    data: { updatedAt: new Date() }
  }).catch(() => null);

  await prisma.chatRoomMember.updateMany({
    where: {
      chatRoomId: room.id,
      userId
    },
    data: { lastReadAt: new Date() }
  });

  await recordCommunicationEvent({
    appointmentId: apptId,
    userId,
    actorRole: userId === appointment.dentistId ? 'dentist' : userId === appointment.patientId ? 'patient' : 'participant',
    eventType: 'message_sent',
    provider: 'twilio-conversations',
    providerEventId: sent.messageSid,
    resourceSid: conversationSid,
    metadata: {
      messageType,
      chatRoomId: room.id.toString()
    }
  });

  logCommunicationEvent('message_synced', {
    appointmentId: apptId,
    chatRoomId: room.id,
    messageId: newMessage.id,
    twilioMessageSid: newMessage.twilioMessageSid,
    source: 'local_send'
  });

  return {
    message: serializeMessage(newMessage, appointment.id),
    channelName: room.channelName,
    appointmentId: appointment.id.toString(),
    participants: {
      dentistId: appointment.dentistId.toString(),
      patientId: appointment.patientId.toString()
    }
  };
}

export async function fetchChatMessages({ appointmentId, limit = 50, before }) {
  const apptId = BigInt(appointmentId);
  const { room } = await ensureChatRoom({ appointmentId: apptId });
  const where = { chatRoomId: room.id };
  if (before) {
    where.createdAt = { lt: new Date(before) };
  }
  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      sender: {
        select: { id: true, name: true, email: true, avatar_url: true }
      },
      senderCommunicationParticipant: {
        select: { id: true, displayName: true, email: true, role: true }
      }
    }
  });

  return messages.map((msg) => serializeMessage(msg, apptId)).reverse();
}

export async function updateLastRead({ appointmentId, userId }) {
  const apptId = BigInt(appointmentId);
  const userBigInt = BigInt(userId);
  const { room } = await ensureChatRoom({ appointmentId: apptId });
  await prisma.chatRoomMember.update({
    where: {
      chatRoomId_userId: {
        chatRoomId: room.id,
        userId: userBigInt
      }
    },
    data: { lastReadAt: new Date() }
  }).catch(() => null);

  await recordCommunicationEvent({
    appointmentId: apptId,
    userId: userBigInt,
    eventType: 'message_read',
    metadata: {
      chatRoomId: room.id.toString()
    }
  });
}

export async function listChatRoomsForUser(userId) {
  const userBigInt = BigInt(userId);
  const memberships = await prisma.chatRoomMember.findMany({
    where: { userId: userBigInt },
    include: {
      chatRoom: {
        include: {
          appointment: {
            include: {
              dentist: { select: { id: true, name: true, email: true } },
              patient: { select: { id: true, name: true, email: true, avatar_url: true } }
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: { select: { id: true, name: true, email: true, avatar_url: true } },
              senderCommunicationParticipant: {
                select: { id: true, displayName: true, email: true, role: true }
              }
            }
          }
        }
      }
    }
  });

  const conversations = await Promise.all(
    memberships.map(async (member) => {
      const room = member.chatRoom;
      const appointment = room.appointment;
      const lastMessage = room.messages?.[0] || null;

      const unreadCount = await prisma.chatMessage.count({
        where: {
          chatRoomId: room.id,
          createdAt: member.lastReadAt ? { gt: member.lastReadAt } : undefined,
          senderId: { not: userBigInt }
        }
      });

      return {
        appointmentId: appointment.id.toString(),
        chatRoomId: room.id.toString(),
        channelName: room.channelName,
        conversationSid: room.twilio_conversation_sid || null,
        commStatus: appointment.commStatus,
        patient: appointment.patient
          ? {
              id: appointment.patient.id.toString(),
              name: appointment.patient.name,
              email: appointment.patient.email,
              avatar: appointment.patient.avatar_url
            }
          : null,
        dentist: appointment.dentist
          ? {
              id: appointment.dentist.id.toString(),
              name: appointment.dentist.name,
              email: appointment.dentist.email
            }
          : null,
        lastMessage: lastMessage ? serializeMessage(lastMessage, appointment.id) : null,
        unreadCount,
        lastReadAt: member.lastReadAt,
        role: member.role
      };
    })
  );

  return conversations.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}

export async function generateVideoAccessToken({ appointmentId, userId, expireSeconds = 3600 }) {
  const apptId = BigInt(appointmentId);
  const userBigInt = BigInt(userId);

  const appointment = await prisma.appointment.findUnique({
    where: { id: apptId },
    select: { dentistId: true, patientId: true, videoRoomRef: true }
  });
  if (!appointment) {
    throw new Error('APPOINTMENT_NOT_FOUND');
  }
  if (userBigInt !== appointment.dentistId && userBigInt !== appointment.patientId) {
    throw new Error('FORBIDDEN');
  }

  const { channelName, roomSid } = await ensureVideoChannel({ appointmentId: apptId });
  const token = buildTwilioVideoToken({
    roomName: channelName,
    identity: userBigInt.toString(),
    expireSeconds
  });

  return {
    roomName: channelName,
    channelName,
    roomSid,
    token,
    expireSeconds
  };
}

function buildWaitingRoomState(appointment) {
  const earlyMinutes = parseInt(process.env.COMM_WAITING_ROOM_EARLY_MINUTES || '15', 10);
  const graceMinutes = parseInt(process.env.COMM_WAITING_ROOM_GRACE_MINUTES || '60', 10);
  const now = Date.now();
  const startsAt = new Date(appointment.startsAt).getTime();
  const endsAt = new Date(appointment.endsAt).getTime();
  const opensAt = startsAt - earlyMinutes * 60_000;
  const closesAt = endsAt + graceMinutes * 60_000;
  const paymentReady = ['confirmed', 'completed'].includes(appointment.status) || appointment.commStatus === 'ready';
  const withinVideoWindow = now >= opensAt && now <= closesAt;
  let state = 'ready';

  if (!paymentReady) {
    state = 'payment_pending';
  } else if (now < opensAt) {
    state = 'scheduled_waiting';
  } else if (now > closesAt) {
    state = 'ended';
  }

  return {
    state,
    paymentReady,
    canChat: paymentReady,
    canJoinVideo: paymentReady && withinVideoWindow,
    opensAt: new Date(opensAt).toISOString(),
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    closesAt: new Date(closesAt).toISOString()
  };
}

async function appointmentVideoRoomEnded(appointment) {
  if (['completed', 'cancelled', 'no-show'].includes(appointment.status)) return true;
  const endedEvent = await prisma.communicationEvent.findFirst({
    where: {
      appointmentId: appointment.id,
      eventType: { in: ['room_ended', 'consultation_room_hard_ended'] }
    },
    select: { id: true }
  });
  return Boolean(endedEvent);
}

function buildCombinedTwilioToken({
  identity,
  roomName,
  ttl = 3600,
  includeConversations = true,
  includeVideo = true
}) {
  const config = getTwilioStandardKeyConfig();
  const AccessToken = twilio.jwt.AccessToken;
  const token = new AccessToken(config.accountSid, config.apiKeySid, config.apiKeySecret, {
    identity,
    ttl
  });
  if (includeConversations) {
    const serviceSid = getConversationsServiceSid();
    const ConversationsGrant = AccessToken.ConversationsGrant || AccessToken.ChatGrant;
    token.addGrant(new ConversationsGrant({ serviceSid }));
  }
  if (includeVideo) {
    token.addGrant(new AccessToken.VideoGrant({ room: roomName }));
  }
  return {
    token: token.toJwt(),
    expiresAt: new Date(Date.now() + ttl * 1000).toISOString()
  };
}

export async function issueAppointmentScopedToken({ appointmentId, user, ttl = 3600, requestedRole = null }) {
  const role = requestedRole === 'observer' ? 'observer' : null;
  const mode = role;
  const effectiveTtl = clampCommunicationTokenTtl({ ttl, mode });
  const appointment = await getAppointmentForAuthorizedUser({ appointmentId, user, requestedRole: role });
  const waitingRoom = buildWaitingRoomState(appointment);

  if (!waitingRoom.paymentReady) {
    const error = new Error('COMMUNICATIONS_NOT_READY');
    error.status = 409;
    error.waitingRoom = waitingRoom;
    throw error;
  }

  if (role === 'observer') {
    getConversationsServiceSid();
    const roomEnded = waitingRoom.state === 'ended' || await appointmentVideoRoomEnded(appointment);
    if (roomEnded) {
      await recordCommunicationEvent({
        appointmentId: appointment.id,
        userId: user.id,
        actorRole: 'observer',
        eventType: 'clinic_observer_denied',
        provider: 'api',
        metadata: {
          reason: 'room_ended',
          roomName: appointment.videoRoomRef || appointmentScopedRoomName(appointment.id)
        }
      }).catch(() => null);
      const error = new Error('ROOM_ENDED');
      error.status = 409;
      error.waitingRoom = waitingRoom;
      throw error;
    }
  }

  const resources = appointment.commStatus === 'ready'
    && appointment.chatRoom?.twilio_conversation_sid
    && appointment.videoRoomRef
    && appointment.video_room_sid
    ? {
        chatRoom: appointment.chatRoom,
        conversationSid: appointment.chatRoom.twilio_conversation_sid,
        roomName: appointment.videoRoomRef,
        videoRoomSid: appointment.video_room_sid
      }
    : await ensureCommunicationResourcesForAppointment({
        appointmentId: appointment.id,
        reason: 'token_issuance'
      });

  const actorRole = role || communicationActorRoleForAppointment(user, appointment);
  const identity = role === 'observer'
    ? `appointment-${appointment.id}-observer-${user.id}`
    : user.id.toString();
  const tokenData = buildCombinedTwilioToken({
    identity,
    roomName: resources.roomName,
    ttl: effectiveTtl,
    includeConversations: role !== 'observer',
    includeVideo: true
  });
  const grants = role === 'observer' ? ['video'] : ['conversations', 'video'];
  const eventType = role === 'observer' ? 'clinic_observer_token_issued' : 'token_issued';

  await recordCommunicationEvent({
    appointmentId: appointment.id,
    userId: user.id,
    actorRole,
    eventType,
    provider: 'api',
    metadata: {
      identity,
      requestedRole: role || actorRole,
      mode: role || 'participant',
      observeOnly: role === 'observer',
      roomName: resources.roomName,
      conversationSid: role === 'observer' ? null : resources.conversationSid,
      expiresAt: tokenData.expiresAt,
      ttlSeconds: effectiveTtl,
      requestedTtlSeconds: Number.parseInt(ttl, 10) || null
    }
  });

  logCommunicationEvent(eventType, {
    appointmentId: appointment.id,
    userId: user.id,
    identity,
    actorRole,
    mode: role || 'participant',
    observeOnly: role === 'observer',
    roomName: resources.roomName,
    conversationSid: role === 'observer' ? null : resources.conversationSid,
    expiresAt: tokenData.expiresAt,
    ttlSeconds: effectiveTtl
  });

  return {
    appointmentId: appointment.id.toString(),
    identity,
    role: actorRole,
    actorRole,
    mode: role || 'participant',
    observeOnly: role === 'observer',
    token: tokenData.token,
    expiresAt: tokenData.expiresAt,
    ttlSeconds: effectiveTtl,
    grants,
    waitingRoom,
    chat: {
      token: role === 'observer' ? null : tokenData.token,
      conversationSid: role === 'observer' ? null : resources.conversationSid,
      channelName: resources.chatRoom?.channelName || appointmentScopedRoomName(appointment.id),
      canRead: role !== 'observer',
      canWrite: role !== 'observer'
    },
    video: {
      token: tokenData.token,
      roomName: resources.roomName,
      roomSid: resources.videoRoomSid,
      canJoin: waitingRoom.canJoinVideo,
      observeOnly: role === 'observer'
    },
    // Backward-compatible fields for existing web/mobile clients.
    conversationSid: role === 'observer' ? null : resources.conversationSid,
    roomName: resources.roomName,
    channelName: resources.roomName,
    videoToken: tokenData.token
  };
}

export async function issueExternalParticipantScopedToken({ appointmentId, participant, ttl = 3600 }) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: BigInt(appointmentId) },
    include: { chatRoom: true }
  });
  if (!appointment) {
    const error = new Error('APPOINTMENT_NOT_FOUND');
    error.status = 404;
    throw error;
  }

  const waitingRoom = buildWaitingRoomState(appointment);
  if (!waitingRoom.paymentReady) {
    const error = new Error('COMMUNICATIONS_NOT_READY');
    error.status = 409;
    error.waitingRoom = waitingRoom;
    throw error;
  }

  const resources = await ensureCommunicationResourcesForAppointment({
    appointmentId: appointment.id,
    reason: 'participant_token_issuance'
  });
  const identity = participant.identity;
  const tokenData = buildCombinedTwilioToken({
    identity,
    roomName: resources.roomName,
    ttl
  });

  await recordCommunicationEvent({
    appointmentId: appointment.id,
    userId: participant.userId || null,
    actorRole: participant.role,
    eventType: 'token_issued',
    metadata: {
      participantId: participant.id,
      identity,
      roomName: resources.roomName,
      conversationSid: resources.conversationSid,
      expiresAt: tokenData.expiresAt
    }
  });

  logCommunicationEvent('token_issued', {
    appointmentId: appointment.id,
    participantId: participant.id,
    actorRole: participant.role,
    roomName: resources.roomName,
    conversationSid: resources.conversationSid,
    expiresAt: tokenData.expiresAt
  });

  return {
    appointmentId: appointment.id.toString(),
    identity,
    token: tokenData.token,
    expiresAt: tokenData.expiresAt,
    grants: ['conversations', 'video'],
    waitingRoom,
    chat: {
      token: tokenData.token,
      conversationSid: resources.conversationSid,
      channelName: resources.chatRoom?.channelName || appointmentScopedRoomName(appointment.id)
    },
    video: {
      token: tokenData.token,
      roomName: resources.roomName,
      roomSid: resources.videoRoomSid,
      canJoin: waitingRoom.canJoinVideo
    },
    conversationSid: resources.conversationSid,
    roomName: resources.roomName,
    channelName: resources.roomName,
    videoToken: tokenData.token
  };
}

export async function getCommunicationHealth({ appointmentId, user }) {
  const appointment = await getAppointmentForAuthorizedUser({ appointmentId, user });
  const events = await prisma.communicationEvent.findMany({
    where: { appointmentId: appointment.id },
    orderBy: { occurredAt: 'desc' },
    take: 25
  });
  const activeVideoSessions = await prisma.videoSession.findMany({
    where: {
      appointmentId: appointment.id,
      leftAt: null
    },
    orderBy: { joinedAt: 'desc' }
  });

  return {
    appointmentId: appointment.id.toString(),
    status: appointment.status,
    commStatus: appointment.commStatus,
    chatRoomRef: appointment.chatRoomRef,
    videoRoomRef: appointment.videoRoomRef,
    conversationSid: appointment.chatRoom?.twilio_conversation_sid || null,
    videoRoomSid: appointment.video_room_sid || null,
    waitingRoom: buildWaitingRoomState(appointment),
    activeVideoSessions: activeVideoSessions.map((session) => ({
      id: session.id.toString(),
      userId: session.userId.toString(),
      actorRole: session.actorRole,
      joinedAt: session.joinedAt
    })),
    events: events.map((event) => ({
      id: event.id.toString(),
      eventType: event.eventType,
      userId: event.userId?.toString?.() ?? null,
      actorRole: event.actorRole,
      provider: event.provider,
      providerEventId: event.providerEventId,
      resourceSid: event.resourceSid,
      providerSid: event.providerSid || event.resourceSid,
      metadata: event.metadata || {},
      occurredAt: event.occurredAt
    }))
  };
}

export async function emitAppointmentEvent({ type, appointmentId, payload = {} }) {
  try {
    await queueNotificationEvent({
      eventType: type,
      appointmentId,
      payload
    });
  } catch (error) {
    console.error('Failed to queue notification event', {
      type,
      appointmentId: appointmentId?.toString?.() ?? appointmentId,
      error: error.message
    });
  }
}

export const __testables = {
  buildCombinedTwilioToken,
  buildWaitingRoomState,
  clampCommunicationTokenTtl,
  normalizeCommunicationTokenMode,
  evaluateClinicObserverAccess,
  sanitizeEventMetadata
};
