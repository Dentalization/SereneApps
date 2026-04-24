import { PrismaClient } from '@prisma/client';
import { emitChatMessage } from '../../sockets/chat.js';

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

  // 1. Find the corresponding ChatRoom
  const chatRoom = await prisma.chatRoom.findUnique({
    where: { twilio_conversation_sid: ConversationSid },
    include: { appointment: true }
  });

  if (!chatRoom) {
    console.warn(`[ChatWebhook] Received message for unknown conversation SID: ${ConversationSid}`);
    return { skipped: true, reason: 'unknown_conversation' };
  }

  // 2. Check for existing message to prevent duplicates (Idempotency)
  const existing = await prisma.chatMessage.findFirst({
    where: { twilioMessageSid: MessageSid }
  });

  if (existing) {
    return { skipped: true, reason: 'duplicate' };
  }

  // 3. Parse sender identity
  let senderId;
  try {
    senderId = BigInt(Author);
  } catch (e) {
    console.error(`[ChatWebhook] Invalid Author ID: ${Author}`);
    return { skipped: true, reason: 'invalid_author' };
  }

  // 4. Parse attributes if any
  let attrs = {};
  try {
    attrs = Attributes ? JSON.parse(Attributes) : {};
  } catch (e) {
    console.warn(`[ChatWebhook] Failed to parse attributes for message ${MessageSid}`);
  }

  // 5. Save to database
  const newMessage = await prisma.chatMessage.create({
    data: {
      chatRoomId: chatRoom.id,
      senderId: senderId,
      message: Body || '',
      messageType: attrs.type || 'text',
      twilioMessageSid: MessageSid,
      createdAt: DateCreated ? new Date(DateCreated) : new Date(),
      fileUrl: attrs.fileUrl,
      fileName: attrs.fileName
    },
    include: {
      sender: {
        select: { id: true, name: true, email: true, avatar_url: true }
      }
    }
  });

  // 6. Notify connected Socket.io clients (for web-to-mobile or hybrid sync)
  emitChatMessage({
    channelName: chatRoom.channelName,
    message: {
      id: newMessage.id.toString(),
      chatRoomId: newMessage.chatRoomId.toString(),
      senderId: newMessage.senderId.toString(),
      appointmentId: chatRoom.appointmentId.toString(),
      message: newMessage.message,
      messageType: newMessage.messageType,
      fileUrl: newMessage.fileUrl,
      fileName: newMessage.fileName,
      createdAt: newMessage.createdAt,
      sender: newMessage.sender ? {
        id: newMessage.sender.id.toString(),
        name: newMessage.sender.name,
        email: newMessage.sender.email,
        avatar: newMessage.sender.avatar_url
      } : null
    }
  });

  return { success: true, messageId: newMessage.id.toString() };
}
