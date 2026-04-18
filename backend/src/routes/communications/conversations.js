import express from 'express';
import { authenticateToken } from '../../utils/tokens.js';
import { PrismaClient } from '@prisma/client';
import ConversationsAdapter from '../../services/communications/conversationsAdapter.js';

const router = express.Router();
const prisma = new PrismaClient();
const adapter = new ConversationsAdapter();

// GET /appointments/:appointmentId/token
router.get('/appointments/:appointmentId/token', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;

    const chatRoom = await prisma.chatRoom.findUnique({
      where: { appointmentId: BigInt(appointmentId) },
      include: { members: true }
    });

    if (!chatRoom) {
      return res.status(404).json({ error: { code: 'CONVERSATION_NOT_PROVISIONED', message: 'Chat belum tersedia. Selesaikan pembayaran terlebih dahulu.' } });
    }

    const isMember = chatRoom.members.some(member => member.userId === BigInt(userId));
    if (!isMember) {
      return res.status(403).json({ error: { code: 'CONVERSATION_ACCESS_DENIED' } });
    }

    if (!chatRoom.twilio_conversation_sid) {
      return res.status(404).json({ error: { code: 'CONVERSATION_NOT_PROVISIONED', message: 'Chat belum tersedia. Selesaikan pembayaran terlebih dahulu.' } });
    }

    const tokenData = await adapter.generateAccessToken({ identity: String(userId), ttl: 3600 });

    return res.status(200).json({
      token: tokenData.token,
      conversationSid: chatRoom.twilio_conversation_sid,
      identity: tokenData.identity,
      expiresAt: tokenData.expiresAt
    });

  } catch (error) {
    console.error('Error generating Twilio token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /appointments/:appointmentId/messages
router.get('/appointments/:appointmentId/messages', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { before, limit = 50 } = req.query;
    const userId = req.user.id;

    const chatRoom = await prisma.chatRoom.findUnique({
      where: { appointmentId: BigInt(appointmentId) },
      include: { members: true }
    });

    if (!chatRoom) {
      return res.status(404).json({ error: { code: 'CONVERSATION_NOT_PROVISIONED', message: 'Chat belum tersedia. Selesaikan pembayaran terlebih dahulu.' } });
    }

    const isMember = chatRoom.members.some(member => member.userId === BigInt(userId));
    if (!isMember) {
      return res.status(403).json({ error: { code: 'CONVERSATION_ACCESS_DENIED' } });
    }

    const limitNum = parseInt(limit, 10);
    const query = {
      where: { chatRoomId: chatRoom.id },
      orderBy: { createdAt: 'desc' },
      take: limitNum + 1,
    };

    if (before) {
      query.where.id = { lt: BigInt(before) };
    }

    const messages = await prisma.chatMessage.findMany(query);
    
    const hasMore = messages.length > limitNum;
    if (hasMore) {
      messages.pop(); // remove extra item
    }

    // Reverse to achieve ASC ordering conceptually, as requested.
    const orderedMessages = messages.reverse();

    const returnMessages = orderedMessages.map(msg => ({
      id: msg.id.toString(),
      senderId: msg.senderId.toString(),
      message: msg.message,
      messageType: msg.messageType,
      createdAt: msg.createdAt,
      // Pass null if twilioMessageSid doesn't exist on schema but requested by client interface
      twilioMessageSid: msg.twilioMessageSid || null 
    }));

    const nextCursor = orderedMessages.length > 0 ? orderedMessages[0].id : null;

    return res.status(200).json({
      messages: returnMessages,
      hasMore,
      nextCursor
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /appointments/:appointmentId/chat/read
router.patch('/appointments/:appointmentId/chat/read', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;

    const chatRoom = await prisma.chatRoom.findUnique({
      where: { appointmentId: BigInt(appointmentId) },
      include: { members: true }
    });

    if (!chatRoom) {
      return res.status(404).json({ error: 'Not found' });
    }

    const isMember = chatRoom.members.some(member => member.userId === BigInt(userId));
    if (!isMember) {
      return res.status(403).json({ error: { code: 'CONVERSATION_ACCESS_DENIED' } });
    }

    await prisma.chatRoomMember.update({
      where: {
        chatRoomId_userId: {
          chatRoomId: chatRoom.id,
          userId: BigInt(userId)
        }
      },
      data: {
        lastReadAt: new Date()
      }
    });

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Error updating read status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
