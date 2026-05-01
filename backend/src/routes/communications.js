import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../utils/tokens.js';
import { PrismaClient } from '@prisma/client';
import {
  ensureChatRoom,
  fetchChatMessages,
  saveChatMessage,
  updateLastRead,
  listChatRoomsForUser,
  issueAppointmentScopedToken,
  normalizeCommunicationTokenMode,
  getCommunicationHealth,
  hardEndAppointmentConsultationRoom,
  recordCommunicationEvent,
  communicationActorRoleForAppointment
} from '../services/communications.js';
import {
  kickCommunicationParticipant,
  inviteCommunicationParticipant,
  listCommunicationParticipants,
  regenerateCommunicationParticipantAccess,
  resendCommunicationParticipantInvite,
  revokeCommunicationParticipant,
  verifyCommunicationParticipantInvite
} from '../services/communications/participantAccessService.js';
import {
  getAttachmentDownload,
  storeChatAttachment
} from '../services/communications/attachmentStorageService.js';
import { emitChatRead } from '../sockets/chat.js';

const router = express.Router();
const prisma = new PrismaClient();

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
  storage: multer.memoryStorage(),
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

const CLIENT_EVENT_TYPES = new Set([
  'waiting_room_entered',
  'device_check_started',
  'device_check_passed',
  'device_check_failed',
  'participant_reconnected',
  'network_quality_degraded',
  'attachment_uploaded'
]);

export function deprecatedVideoTokenHeaders() {
  return {
    Deprecation: 'true',
    Sunset: 'Fri, 31 Jul 2026 23:59:59 GMT',
    Link: '</communications/appointments/:appointmentId/token>; rel="successor-version"; type="application/json"'
  };
}

function sanitizeClientMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  const safe = {};
  for (const [key, value] of Object.entries(metadata)) {
    const lowered = key.toLowerCase();
    if (lowered.includes('token') || lowered.includes('secret') || lowered.includes('otp') || lowered.includes('code')) {
      continue;
    }
    if (typeof value === 'string') {
      safe[key] = value.slice(0, 160);
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      safe[key] = value;
    }
  }
  return safe;
}

function sendCommunicationRouteError(res, error, fallbackCode = 'COMMUNICATIONS_REQUEST_FAILED') {
  if (error.status === 403 || error.message === 'FORBIDDEN') {
    return res.status(403).json({ error: { code: 'COMMUNICATIONS_ACCESS_DENIED' } });
  }
  if (error.status === 404 || error.message === 'APPOINTMENT_NOT_FOUND' || error.message === 'PARTICIPANT_NOT_FOUND') {
    return res.status(404).json({ error: { code: error.message || 'NOT_FOUND' } });
  }
  if ([409, 410].includes(error.status)) {
    return res.status(error.status).json({ error: { code: error.message } });
  }
  if (error.status === 400) {
    return res.status(400).json({ error: { code: error.message } });
  }
  if (error.message?.startsWith?.('TWILIO_') || error.code === 'TWILIO_CONVERSATIONS_ERROR') {
    return res.status(503).json({ error: { code: 'COMMUNICATIONS_PROVIDER_UNAVAILABLE' } });
  }
  if (error.message?.startsWith?.('COMM_ATTACHMENT_')) {
    return res.status(error.status || 503).json({ error: { code: error.message } });
  }
  console.error('Communications route error:', error);
  return res.status(500).json({ error: { code: fallbackCode } });
}

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

      res.status(201).json({ message: saved.message });
    } catch (error) {
      console.error('Error saving chat message:', error);
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'forbidden' });
      }
      if (error.message === 'APPOINTMENT_NOT_FOUND') {
        return res.status(404).json({ error: 'appointment not found' });
      }
      if (error.message?.startsWith?.('TWILIO_') || error.code === 'TWILIO_CONVERSATIONS_ERROR') {
        return res.status(503).json({ error: { code: 'COMMUNICATIONS_PROVIDER_UNAVAILABLE' } });
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

      const appointment = await getAppointmentForUser(appointmentId, req.user);
      const stored = await storeChatAttachment({ appointmentId: appointment.id, file });
      const saved = await saveChatMessage({
        appointmentId,
        senderId: req.user.id,
        message: file.originalname,
        messageType: 'file',
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        fileSizeBytes: stored.fileSizeBytes,
        storageProvider: stored.storageProvider,
        storageBucket: stored.storageBucket,
        storageObjectKey: stored.storageObjectKey,
        mediaRetentionUntil: stored.mediaRetentionUntil,
        mediaScanStatus: stored.mediaScanStatus,
        metadata: stored.metadata
      });
      await recordCommunicationEvent({
        appointmentId,
        userId: req.user.id,
        actorRole: communicationActorRoleForAppointment(req.user, appointment),
        eventType: 'attachment_uploaded',
        provider: stored.storageProvider,
        metadata: {
          messageId: saved.message.id,
          mimeType: file.mimetype,
          size: file.size,
          storageProvider: stored.storageProvider,
          scanStatus: stored.mediaScanStatus
        }
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
      if (error.message?.startsWith?.('TWILIO_') || error.code === 'TWILIO_CONVERSATIONS_ERROR') {
        return res.status(503).json({ error: { code: 'COMMUNICATIONS_PROVIDER_UNAVAILABLE' } });
      }
      if (error.message?.startsWith?.('COMM_ATTACHMENT_')) {
        return res.status(error.status || 503).json({ error: { code: error.message } });
      }
      return res.status(500).json({ error: 'Failed to upload attachment' });
    }
  }
);

router.get(
  '/attachments/:messageId/download',
  async (req, res) => {
    try {
      const download = await getAttachmentDownload({
        messageId: req.params.messageId,
        expiresAt: req.query.expiresAt,
        signature: req.query.signature
      });
      if (download.redirectUrl) {
        return res.redirect(302, download.redirectUrl);
      }
      res.setHeader('Content-Type', download.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(download.fileName)}"`);
      if (download.fileSizeBytes) {
        res.setHeader('Content-Length', download.fileSizeBytes.toString());
      }
      return download.stream.pipe(res);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ error: { code: error.message } });
      }
      console.error('Attachment download failed:', error);
      return res.status(500).json({ error: { code: 'ATTACHMENT_DOWNLOAD_FAILED' } });
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
  '/appointments/:appointmentId/events',
  authenticateToken,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const { eventType, provider = 'client', providerSid = null, metadata = {} } = req.body || {};
      if (!CLIENT_EVENT_TYPES.has(eventType)) {
        return res.status(400).json({ error: { code: 'INVALID_COMMUNICATION_EVENT_TYPE' } });
      }

      const appointment = await getAppointmentForUser(appointmentId, req.user);
      const event = await recordCommunicationEvent({
        appointmentId: appointment.id,
        userId: req.user.id,
        actorRole: communicationActorRoleForAppointment(req.user, appointment),
        eventType,
        provider,
        providerSid,
        resourceSid: providerSid,
        metadata: sanitizeClientMetadata(metadata)
      });

      return res.status(201).json({
        event: event
          ? {
              id: event.id.toString(),
              eventType: event.eventType,
              occurredAt: event.occurredAt
            }
          : null
      });
    } catch (error) {
      return sendCommunicationRouteError(res, error, 'COMMUNICATION_EVENT_FAILED');
    }
  }
);

router.post(
  '/appointments/:appointmentId/participants/invite',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await inviteCommunicationParticipant({
        appointmentId: req.params.appointmentId,
        user: req.user,
        input: req.body || {}
      });
      return res.status(201).json(result);
    } catch (error) {
      return sendCommunicationRouteError(res, error, 'PARTICIPANT_INVITE_FAILED');
    }
  }
);

router.get(
  '/appointments/:appointmentId/participants',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await listCommunicationParticipants({
        appointmentId: req.params.appointmentId,
        user: req.user
      });
      return res.json(result);
    } catch (error) {
      return sendCommunicationRouteError(res, error, 'PARTICIPANTS_LOAD_FAILED');
    }
  }
);

router.post(
  '/appointments/:appointmentId/participants/:participantId/revoke',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await revokeCommunicationParticipant({
        appointmentId: req.params.appointmentId,
        participantId: req.params.participantId,
        user: req.user
      });
      return res.json(result);
    } catch (error) {
      return sendCommunicationRouteError(res, error, 'PARTICIPANT_REVOKE_FAILED');
    }
  }
);

router.post(
  '/appointments/:appointmentId/participants/:participantId/resend',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await resendCommunicationParticipantInvite({
        appointmentId: req.params.appointmentId,
        participantId: req.params.participantId,
        user: req.user,
        expiresInHours: req.body?.expiresInHours
      });
      return res.json(result);
    } catch (error) {
      return sendCommunicationRouteError(res, error, 'PARTICIPANT_INVITE_RESEND_FAILED');
    }
  }
);

router.post(
  '/appointments/:appointmentId/participants/:participantId/regenerate-access',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await regenerateCommunicationParticipantAccess({
        appointmentId: req.params.appointmentId,
        participantId: req.params.participantId,
        user: req.user
      });
      return res.json(result);
    } catch (error) {
      return sendCommunicationRouteError(res, error, 'PARTICIPANT_ACCESS_REGENERATE_FAILED');
    }
  }
);

router.post(
  '/appointments/:appointmentId/participants/:participantId/kick',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await kickCommunicationParticipant({
        appointmentId: req.params.appointmentId,
        participantId: req.params.participantId,
        user: req.user
      });
      return res.json(result);
    } catch (error) {
      return sendCommunicationRouteError(res, error, 'PARTICIPANT_KICK_FAILED');
    }
  }
);

router.post(
  '/appointments/:appointmentId/participants/verify-invite',
  async (req, res) => {
    try {
      const { token, ttl } = req.body || {};
      const result = await verifyCommunicationParticipantInvite({
        token,
        appointmentId: req.params.appointmentId,
        ttl: ttl ? parseInt(ttl, 10) : 3600
      });
      return res.json(result);
    } catch (error) {
      return sendCommunicationRouteError(res, error, 'INVITE_VERIFY_FAILED');
    }
  }
);

router.post(
  '/appointments/:appointmentId/video/end',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await hardEndAppointmentConsultationRoom({
        appointmentId: req.params.appointmentId,
        user: req.user
      });
      return res.json(result);
    } catch (error) {
      return sendCommunicationRouteError(res, error, 'VIDEO_ROOM_END_FAILED');
    }
  }
);

router.post(
  '/appointments/:appointmentId/video/token',
  authenticateToken,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const { expireSeconds } = req.body || {};

      const deprecationHeaders = deprecatedVideoTokenHeaders();
      Object.entries(deprecationHeaders).forEach(([header, value]) => res.set(header, value));

      const session = await issueAppointmentScopedToken({
        appointmentId,
        user: req.user,
        ttl: expireSeconds ? parseInt(expireSeconds, 10) : 3600
      });

      await recordCommunicationEvent({
        appointmentId,
        userId: req.user.id,
        actorRole: 'deprecated_client',
        eventType: 'deprecated_video_token_route_used',
        provider: 'api',
        metadata: {
          route: 'POST /communications/appointments/:appointmentId/video/token',
          successor: 'GET /communications/appointments/:appointmentId/token',
          sunset: '2026-07-31'
        }
      });

      res.json({
        appointmentId: session.appointmentId,
        roomName: session.video.roomName,
        channelName: session.video.roomName,
        roomSid: session.video.roomSid,
        token: session.video.token,
        expiresAt: session.expiresAt,
        waitingRoom: session.waitingRoom,
        deprecated: true
      });
    } catch (error) {
      console.error('Error generating video token:', error);
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'forbidden' });
      }
      if (error.message === 'APPOINTMENT_NOT_FOUND') {
        return res.status(404).json({ error: 'appointment not found' });
      }
      if (error.status === 409) {
        return res.status(409).json({
          error: {
            code: 'COMMUNICATIONS_NOT_READY',
            message: 'Communication resources are not ready for this appointment.'
          },
          waitingRoom: error.waitingRoom
        });
      }
      if (error.message?.startsWith?.('TWILIO_')) {
        return res.status(503).json({ error: 'Twilio configuration missing on server' });
      }
      return res.status(500).json({ error: 'Failed to generate video token' });
    }
  }
);

/**
 * GET /appointments/:appointmentId/token
 * Unified appointment-scoped initiation contract.
 * Stable response envelope:
 * - waitingRoom: appointment schedule/payment gate, with canChat/canJoinVideo.
 * - chat: Twilio Conversations token, conversationSid, appointment-scoped channelName.
 * - video: Twilio Video token, appointment-{appointmentId} roomName, roomSid, canJoin.
 * - role=observer: clinic-owner observer token for read-only monitoring UI; no chat token is returned.
 * - compatibility: token, conversationSid, roomName, channelName, videoToken remain for older clients.
 * Tokens are never written to logs or communication_events metadata.
 */
router.get(
  '/appointments/:appointmentId/token',
  authenticateToken,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const ttl = req.query.ttl ? parseInt(req.query.ttl, 10) : 3600;
      const requestedMode = normalizeCommunicationTokenMode(req.query);

      const session = await issueAppointmentScopedToken({
        appointmentId,
        user: req.user,
        ttl,
        requestedRole: requestedMode
      });

      res.json(session);
    } catch (error) {
      console.error('Error generating appointment communications token:', error);
      if (error.status === 403 || error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: { code: 'COMMUNICATIONS_ACCESS_DENIED' } });
      }
      if (error.status === 404 || error.message === 'APPOINTMENT_NOT_FOUND') {
        return res.status(404).json({ error: { code: 'APPOINTMENT_NOT_FOUND' } });
      }
      if (error.status === 409 && error.message === 'ROOM_ENDED') {
        return res.status(409).json({
          error: {
            code: 'ROOM_ENDED',
            message: 'Sesi teledentistry telah berakhir.'
          },
          waitingRoom: error.waitingRoom
        });
      }
      if (error.status === 409 || error.message === 'COMMUNICATIONS_NOT_READY') {
        return res.status(409).json({
          error: {
            code: 'COMMUNICATIONS_NOT_READY',
            message: 'Chat dan video belum tersedia. Selesaikan pembayaran atau tunggu inisialisasi.'
          },
          waitingRoom: error.waitingRoom
        });
      }
      if (error.message?.startsWith?.('TWILIO_') || error.code === 'TWILIO_CONVERSATIONS_ERROR') {
        return res.status(503).json({ error: { code: 'COMMUNICATIONS_PROVIDER_UNAVAILABLE' } });
      }
      res.status(500).json({ error: { code: 'COMMUNICATIONS_TOKEN_FAILED' } });
    }
  }
);

router.get(
  '/appointments/:appointmentId/health',
  authenticateToken,
  async (req, res) => {
    try {
      const health = await getCommunicationHealth({
        appointmentId: req.params.appointmentId,
        user: req.user
      });
      res.json(health);
    } catch (error) {
      console.error('Error fetching communication health:', error);
      if (error.status) {
        return res.status(error.status).json({ error: error.message.toLowerCase() });
      }
      return res.status(500).json({ error: 'Failed to fetch communication health' });
    }
  }
);

export default router;
