import { PrismaClient } from '@prisma/client';
import { emitChatMessage } from '../../sockets/chat.js';
import { logCommunicationEvent } from './logging.js';
import { recordCommunicationEvent } from '../communications.js';
import { parseParticipantIdentity } from './participantAccessService.js';
import { attachmentPresentationForMessage } from './attachmentStorageService.js';

const prisma = new PrismaClient();

/**
 * Handles Twilio Conversations webhooks (specifically onMessageAdded).
 * Synchronizes Twilio messages to the internal database.
 */
export async function handleChatMessageEvent(event) {
  const {
    EventType,
    ConversationSid,
    Author,
    Body,
    MessageSid,
    Attributes,
    DateCreated
  } = event;

  if (EventType !== 'onMessageAdded') {
    return { skipped: true, reason: 'unsupported_event_type' };
  }
  if (!MessageSid) {
    return { skipped: true, reason: 'missing_message_sid' };
  }

  // 1. Find the corresponding ChatRoom
  const chatRoom = await prisma.chatRoom.findUnique({
    where: { twilio_conversation_sid: ConversationSid },
    include: {
      appointment: {
        include: {
          communicationParticipants: true
        }
      },
      members: true
    }
  });

  if (!chatRoom) {
    logCommunicationEvent('message_sync_skipped', {
      reason: 'unknown_conversation',
      conversationSid: ConversationSid,
      messageSid: MessageSid
    }, 'warn');
    return { skipped: true, reason: 'unknown_conversation' };
  }

  // 2. Parse sender identity. Account users use numeric identities; verified guests use appointment-scoped participant identities.
  const parsedIdentity = parseParticipantIdentity(Author);
  if (!parsedIdentity) {
    logCommunicationEvent('message_sync_skipped', {
      reason: 'invalid_author',
      conversationSid: ConversationSid,
      messageSid: MessageSid,
      author: Author
    }, 'warn');
    return { skipped: true, reason: 'invalid_author' };
  }

  const participant = parsedIdentity.type === 'communication_participant'
    ? chatRoom.appointment.communicationParticipants.find((item) => (
        item.id === parsedIdentity.participantId
        && item.appointmentId === chatRoom.appointmentId
        && ['verified', 'joined'].includes(item.status)
      ))
    : null;
  const senderId = parsedIdentity.type === 'user' ? parsedIdentity.userId : participant?.userId || null;
  const isMember = senderId
    ? chatRoom.members.some((member) => member.userId === senderId)
      || chatRoom.appointment.communicationParticipants.some((item) => (
        item.userId === senderId && ['verified', 'joined'].includes(item.status)
      ))
    : Boolean(participant);
  if (!isMember || (parsedIdentity.type === 'communication_participant' && parsedIdentity.appointmentId !== chatRoom.appointmentId)) {
    logCommunicationEvent('permission_denied', {
      appointmentId: chatRoom.appointmentId,
      userId: senderId?.toString?.() ?? null,
      participantId: participant?.id,
      action: 'twilio_message_sync',
      messageSid: MessageSid
    }, 'warn');
    return { skipped: true, reason: 'sender_not_member' };
  }

  // 3. Parse attributes if any
  let attrs = {};
  try {
    attrs = Attributes ? JSON.parse(Attributes) : {};
  } catch (e) {
    logCommunicationEvent('message_attribute_parse_failed', {
      messageSid: MessageSid,
      conversationSid: ConversationSid
    }, 'warn');
  }

  const messageType = attrs.type === 'video_call' ? 'system' : (attrs.type || 'text');
  const fileSize = attrs.fileSizeBytes === undefined || attrs.fileSizeBytes === null
    ? null
    : BigInt(attrs.fileSizeBytes);
  const mediaRetentionUntil = attrs.mediaRetentionUntil ? new Date(attrs.mediaRetentionUntil) : null;
  const mediaDeletedAt = attrs.mediaDeletedAt ? new Date(attrs.mediaDeletedAt) : null;

  // 4. Upsert to prevent duplicate writes when Twilio retries or backend-originated sends already saved.
  const newMessage = await prisma.chatMessage.upsert({
    where: { twilioMessageSid: MessageSid },
    update: {
      message: Body || '',
      messageType,
      fileUrl: attrs.fileUrl,
      fileName: attrs.fileName,
      mimeType: attrs.mimeType,
      fileSizeBytes: fileSize,
      mediaRetentionUntil,
      storageProvider: attrs.storageProvider || null,
      storageBucket: attrs.storageBucket || null,
      storageObjectKey: attrs.storageObjectKey || null,
      mediaScanStatus: attrs.mediaScanStatus || null,
      mediaDeletedAt,
      mediaTombstoneReason: attrs.mediaTombstoneReason || null,
      senderCommunicationParticipantId: participant?.id || null,
      metadata: attrs
    },
    create: {
      chatRoomId: chatRoom.id,
      senderId,
      senderCommunicationParticipantId: participant?.id || null,
      message: Body || '',
      messageType,
      twilioMessageSid: MessageSid,
      createdAt: DateCreated ? new Date(DateCreated) : new Date(),
      fileUrl: attrs.fileUrl,
      fileName: attrs.fileName,
      mimeType: attrs.mimeType,
      fileSizeBytes: fileSize,
      mediaRetentionUntil,
      storageProvider: attrs.storageProvider || null,
      storageBucket: attrs.storageBucket || null,
      storageObjectKey: attrs.storageObjectKey || null,
      mediaScanStatus: attrs.mediaScanStatus || null,
      mediaDeletedAt,
      mediaTombstoneReason: attrs.mediaTombstoneReason || null,
      metadata: attrs
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

  await recordCommunicationEvent({
    appointmentId: chatRoom.appointmentId,
    userId: senderId,
    actorRole: participant?.role || (senderId === chatRoom.appointment.dentistId ? 'dentist' : senderId === chatRoom.appointment.patientId ? 'patient' : null),
    eventType: attrs.type === 'video_call' && attrs.action ? `call_${attrs.action}` : 'message_webhook_synced',
    provider: 'twilio-conversations',
    providerEventId: MessageSid,
    resourceSid: ConversationSid,
    metadata: {
      messageType,
      action: attrs.action,
      chatRoomId: chatRoom.id.toString(),
      participantId: participant?.id || null
    }
  });

  const attachment = attachmentPresentationForMessage(newMessage);
  const serialized = {
    id: newMessage.id.toString(),
    chatRoomId: newMessage.chatRoomId.toString(),
    senderId: newMessage.senderId?.toString?.() ?? null,
    senderParticipantId: newMessage.senderCommunicationParticipantId || null,
    appointmentId: chatRoom.appointmentId.toString(),
    message: newMessage.message,
    messageType: newMessage.messageType,
    twilioMessageSid: newMessage.twilioMessageSid,
    fileUrl: attachment.fileUrl,
    fileName: newMessage.fileName,
    mimeType: newMessage.mimeType,
    fileSizeBytes: newMessage.fileSizeBytes?.toString?.() ?? null,
    mediaRetentionUntil: newMessage.mediaRetentionUntil,
    storageProvider: newMessage.storageProvider || newMessage.metadata?.storage || null,
    mediaScanStatus: newMessage.mediaScanStatus || newMessage.metadata?.scanStatus || null,
    mediaDeletedAt: newMessage.mediaDeletedAt,
    mediaTombstoneReason: attachment.tombstoneReason,
    attachmentAvailable: attachment.attachmentAvailable,
    metadata: newMessage.metadata || {},
    createdAt: newMessage.createdAt,
    sender: newMessage.sender ? {
      id: newMessage.sender.id.toString(),
      name: newMessage.sender.name,
      email: newMessage.sender.email,
      avatar: newMessage.sender.avatar_url
    } : newMessage.senderCommunicationParticipant ? {
      id: newMessage.senderCommunicationParticipant.id,
      name: newMessage.senderCommunicationParticipant.displayName,
      email: newMessage.senderCommunicationParticipant.email,
      role: newMessage.senderCommunicationParticipant.role,
      participantId: newMessage.senderCommunicationParticipant.id
    } : null
  };

  // 5. Notify connected Socket.io clients (for web-to-mobile or hybrid sync)
  emitChatMessage({
    channelName: chatRoom.channelName,
    message: serialized
  });

  logCommunicationEvent('message_synced', {
    appointmentId: chatRoom.appointmentId,
    chatRoomId: chatRoom.id,
    messageId: newMessage.id,
    twilioMessageSid: MessageSid,
    source: 'twilio_webhook'
  });

  return { success: true, messageId: newMessage.id.toString() };
}
