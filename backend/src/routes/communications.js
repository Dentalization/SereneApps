import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../utils/tokens.js';
import { PrismaClient } from '@prisma/client';
import {
  ensureChatRoom,
  fetchChatMessages,
  saveChatMessage,
  generateVideoAccessToken,
  updateLastRead,
  listChatRoomsForUser
} from '../services/communications.js';
import { emitChatMessage, emitChatRead } from '../sockets/chat.js';

const router = express.Router();
const prisma = new PrismaClient();

const chatUploadDir = path.join(process.cwd(), 'uploads', 'chat');
if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatUploadDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const cleaned = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, `${unique}-${cleaned}`);
  }
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      const error = new Error('UNSUPPORTED_FILE_TYPE');
      error.status = 400;
      return cb(error);
    }
    return cb(null, true);
  }
});

const attachmentUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'file too large' });
    }
    if (err.message === 'UNSUPPORTED_FILE_TYPE') {
      return res.status(400).json({ error: 'unsupported file type' });
    }
    console.error('Attachment upload error:', err);
    return res.status(500).json({ error: 'failed to upload attachment' });
  });
};
function toBigInt(value, fieldName) {
  try {
    return BigInt(value);
  } catch (err) {
    const error = new Error(`INVALID_${fieldName?.toUpperCase() || 'ID'}`);
    error.status = 400;
    throw error;
  }
}

async function getAppointmentForUser(appointmentIdRaw, user) {
  const appointmentId = toBigInt(appointmentIdRaw, 'appointmentId');
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      dentistId: true,
      patientId: true,
      status: true,
      chatRoomRef: true,
      videoRoomRef: true
    }
  });
  if (!appointment) {
    const error = new Error('APPOINTMENT_NOT_FOUND');
    error.status = 404;
    throw error;
  }

  const userId = toBigInt(user.id, 'userId');
  const roles = user.roles || [];
  const isAdmin = roles.includes('admin') || roles.includes('super_admin');
  const isParticipant = userId === appointment.dentistId || userId === appointment.patientId;

  if (!isParticipant && !isAdmin) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }

  return appointment;
}

router.get(
  '/rooms',
  authenticateToken,
  async (req, res) => {
    try {
      const conversations = await listChatRoomsForUser(req.user.id);
      res.json({ conversations });
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      return res.status(500).json({ error: 'Failed to load conversations' });
    }
  }
);

router.get(
  '/appointments/:appointmentId/chat/messages',
  authenticateToken,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
      const before = req.query.before;

      const appointment = await getAppointmentForUser(appointmentId, req.user);
      const { room } = await ensureChatRoom({ appointmentId: appointment.id });
      const messages = await fetchChatMessages({
        appointmentId: appointment.id,
        limit,
        before
      });

      await updateLastRead({ appointmentId: appointment.id, userId: req.user.id });
      emitChatRead({
        channelName: room.channelName,
        appointmentId: appointment.id,
        userId: req.user.id,
        lastReadAt: new Date().toISOString()
      });

      res.json({
        chatRoom: {
          id: room.id.toString(),
          channelName: room.channelName,
          appointmentId: room.appointmentId.toString()
        },
        messages
      });
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      if (error.status) {
        return res.status(error.status).json({ error: error.message.toLowerCase() });
      }
      return res.status(500).json({ error: 'Failed to load chat messages' });
    }
  }
);

router.post(
  '/appointments/:appointmentId/chat/messages',
  authenticateToken,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const { message, messageType } = req.body || {};
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message is required' });
      }

      await getAppointmentForUser(appointmentId, req.user);
      const saved = await saveChatMessage({
        appointmentId,
        senderId: req.user.id,
        message,
        messageType
      });

      emitChatMessage({
        channelName: saved.channelName,
        message: saved.message
      });

      res.status(201).json({ message: saved.message });
    } catch (error) {
      console.error('Error saving chat message:', error);
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'forbidden' });
      }
      if (error.message === 'APPOINTMENT_NOT_FOUND') {
        return res.status(404).json({ error: 'appointment not found' });
      }
      return res.status(500).json({ error: 'Failed to save message' });
    }
  }
);

router.post(
  '/appointments/:appointmentId/chat/attachments',
  authenticateToken,
  attachmentUpload,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'file is required' });
      }

      await getAppointmentForUser(appointmentId, req.user);
      const relativePath = path.posix.join('uploads', 'chat', file.filename);
      const saved = await saveChatMessage({
        appointmentId,
        senderId: req.user.id,
        message: file.originalname,
        messageType: 'file',
        fileUrl: `/${relativePath}`,
        fileName: file.originalname
      });

      emitChatMessage({
        channelName: saved.channelName,
        message: saved.message
      });

      res.status(201).json({ message: saved.message });
    } catch (error) {
      console.error('Error uploading chat attachment:', error);
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'forbidden' });
      }
      if (error.message === 'APPOINTMENT_NOT_FOUND') {
        return res.status(404).json({ error: 'appointment not found' });
      }
      return res.status(500).json({ error: 'Failed to upload attachment' });
    }
  }
);

router.patch(
  '/appointments/:appointmentId/chat/read',
  authenticateToken,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const appointment = await getAppointmentForUser(appointmentId, req.user);
      const { room } = await ensureChatRoom({ appointmentId: appointment.id });
      await updateLastRead({ appointmentId: appointment.id, userId: req.user.id });
      const timestamp = new Date().toISOString();
      emitChatRead({
        channelName: room.channelName,
        appointmentId: appointment.id,
        userId: req.user.id,
        lastReadAt: timestamp
      });
      res.json({ ok: true, lastReadAt: timestamp });
    } catch (error) {
      console.error('Error updating last read:', error);
      if (error.status) {
        return res.status(error.status).json({ error: error.message.toLowerCase() });
      }
      return res.status(500).json({ error: 'Failed to update read state' });
    }
  }
);

router.post(
  '/appointments/:appointmentId/video/token',
  authenticateToken,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const { role = 'publisher', expireSeconds } = req.body || {};

      await getAppointmentForUser(appointmentId, req.user);
      const token = await generateVideoAccessToken({
        appointmentId,
        userId: req.user.id,
        role,
        expireSeconds: expireSeconds ? parseInt(expireSeconds, 10) : 3600
      });

      res.json(token);
    } catch (error) {
      console.error('Error generating video token:', error);
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'forbidden' });
      }
      if (error.message === 'APPOINTMENT_NOT_FOUND') {
        return res.status(404).json({ error: 'appointment not found' });
      }
      if (error.message === 'TWILIO_VIDEO_CONFIG_MISSING') {
        return res.status(500).json({ error: 'Twilio video configuration missing on server' });
      }
      return res.status(500).json({ error: 'Failed to generate video token' });
    }
  }
);

export default router;
