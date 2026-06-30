import { PrismaClient } from '@prisma/client';
import {
  ensureChatRoom,
  fetchChatMessages,
  saveChatMessage,
  updateLastRead
} from '../services/communications.js';

const prisma = new PrismaClient();

let ioRef = null;
const userSockets = new Map(); // Map<userId, Set<socketId>>

function touchUserSocket(userId, socketId, action) {
  const key = userId.toString();
  if (!userSockets.has(key)) {
    userSockets.set(key, new Set());
  }
  const set = userSockets.get(key);
  if (action === 'add') {
    set.add(socketId);
  } else if (action === 'remove') {
    set.delete(socketId);
    if (set.size === 0) {
      userSockets.delete(key);
    }
  }
}

async function authorizeAppointment(appointmentIdRaw, user) {
  let appointmentId;
  try {
    appointmentId = BigInt(appointmentIdRaw);
  } catch (error) {
    const invalidError = new Error('INVALID_APPOINTMENT_ID');
    invalidError.status = 400;
    throw invalidError;
  }
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      dentistId: true,
      patientId: true,
      chatRoomRef: true
    }
  });
  if (!appointment) {
    const error = new Error('APPOINTMENT_NOT_FOUND');
    error.status = 404;
    throw error;
  }

  let userId;
  try {
    userId = BigInt(user.id);
  } catch (error) {
    const invalidError = new Error('INVALID_USER');
    invalidError.status = 401;
    throw invalidError;
  }
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

async function broadcastPresence(roomId, channelName, appointmentId) {
  if (!ioRef) return;
  const members = await prisma.chatRoomMember.findMany({
    where: { chatRoomId: roomId },
    select: { userId: true }
  });
  const onlineUserIds = members
    .map(member => member.userId.toString())
    .filter(id => userSockets.has(id) && userSockets.get(id).size > 0);
  ioRef.to(channelName).emit('chat:presence', {
    appointmentId: appointmentId.toString(),
    onlineUserIds
  });
}

export function emitChatMessage({ channelName, message }) {
  if (!ioRef) return;
  ioRef.to(channelName).emit('chat:new_message', message);
}

export function emitChatRead({ channelName, appointmentId, userId, lastReadAt }) {
  if (!ioRef) return;
  ioRef.to(channelName).emit('chat:read', {
    appointmentId: appointmentId.toString(),
    userId: userId.toString(),
    lastReadAt
  });
}

export function emitToUserRooms({ userIds = [], eventName, payload }) {
  if (!ioRef || !eventName) return;
  for (const userId of userIds.filter(Boolean)) {
    ioRef.to(`user:${userId.toString()}`).emit(eventName, payload);
  }
}

export function registerChatGateway(io) {
  ioRef = io;

  io.on('connection', async (socket) => {
    const user = socket.data.user;
    if (!user?.id) {
      socket.disconnect(true);
      return;
    }

    socket.data.rooms = new Map(); // channelName -> { roomId, appointmentId }
    touchUserSocket(user.id, socket.id, 'add');

    // Join a personal room so we can reach this user even if they haven't opened a chat
    const personalRoom = `user:${user.id}`;
    socket.join(personalRoom);

    try {
      const clinicMemberships = await prisma.clinicStaff.findMany({
        where: {
          userId: BigInt(user.id),
          isActive: true
        },
        select: { clinicProfileId: true }
      });
      for (const membership of clinicMemberships) {
        socket.join(`clinic:${membership.clinicProfileId.toString()}`);
      }
      const roles = Array.isArray(user.roles) ? user.roles : [];
      if (roles.some((role) => role === 'admin' || role === 'super_admin')) {
        socket.join('admin:platform');
      }
    } catch (error) {
      console.error('Socket tenant room setup failed', error);
      socket.disconnect(true);
      return;
    }

    socket.emit('chat:connected', { userId: user.id.toString() });

    socket.on('chat:join', async ({ appointmentId }) => {
      try {
        if (!appointmentId) return;
        const appointment = await authorizeAppointment(appointmentId, user);
        const { room } = await ensureChatRoom({ appointmentId: appointment.id });

        socket.join(room.channelName);
        socket.data.rooms.set(room.channelName, { roomId: room.id, appointmentId: appointment.id });

        const history = await fetchChatMessages({ appointmentId: appointment.id, limit: 50 });
        socket.emit('chat:history', {
          appointmentId: appointment.id.toString(),
          channelName: room.channelName,
          messages: history
        });

        await updateLastRead({ appointmentId: appointment.id, userId: user.id });
        emitChatRead({
          channelName: room.channelName,
          appointmentId: appointment.id,
          userId: user.id,
          lastReadAt: new Date().toISOString()
        });
        await broadcastPresence(room.id, room.channelName, appointment.id);
      } catch (error) {
        console.error('Socket chat:join error', error);
        socket.emit('chat:error', { message: error.message || 'Unable to join chat' });
      }
    });

    socket.on('chat:message', async ({ appointmentId, message, messageType = 'text', fileUrl, fileName }) => {
      try {
        if (!appointmentId || (!message && messageType === 'text')) return;
        await authorizeAppointment(appointmentId, user);
        const saved = await saveChatMessage({
          appointmentId,
          senderId: user.id,
          message: message || fileName || 'Attachment',
          messageType,
          fileUrl,
          fileName
        });

        emitChatMessage({
          channelName: saved.channelName,
          message: saved.message
        });

        socket.emit('chat:message_ack', {
          appointmentId: saved.appointmentId.toString(),
          message: saved.message
        });
      } catch (error) {
        console.error('Socket chat:message error', error);
        socket.emit('chat:error', { message: error.message || 'Unable to send message' });
      }
    });

    socket.on('chat:read', async ({ appointmentId }) => {
      try {
        if (!appointmentId) return;
        const { room } = await ensureChatRoom({ appointmentId });
        await updateLastRead({ appointmentId, userId: user.id });
        emitChatRead({
          channelName: room.channelName,
          appointmentId,
          userId: user.id,
          lastReadAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Socket chat:read error', error);
      }
    });

    // ── Video call signaling ──────────────────────────────────
    socket.on('video:call', async ({ appointmentId }) => {
      try {
        if (!appointmentId) return;
        const appointment = await authorizeAppointment(appointmentId, user);
        const { room } = await ensureChatRoom({ appointmentId: appointment.id });

        const payload = {
          appointmentId: appointment.id.toString(),
          callerId: user.id.toString(),
          callerName: user.name || user.email || 'Unknown',
        };

        // Broadcast to chat room (works if receiver has joined)
        socket.to(room.channelName).emit('video:incoming_call', payload);

        // Also emit to the target participant's personal room for guaranteed delivery
        const targetUserId = BigInt(user.id) === appointment.dentistId
          ? appointment.patientId
          : appointment.dentistId;
        socket.to(`user:${targetUserId}`).emit('video:incoming_call', payload);
      } catch (error) {
        console.error('Socket video:call error', error);
        socket.emit('video:error', { message: error.message || 'Unable to initiate call' });
      }
    });

    socket.on('video:call_response', async ({ appointmentId, accepted }) => {
      try {
        if (!appointmentId) return;
        const appointment = await authorizeAppointment(appointmentId, user);
        const { room } = await ensureChatRoom({ appointmentId: appointment.id });

        const event = accepted ? 'video:call_accepted' : 'video:call_declined';
        socket.to(room.channelName).emit(event, {
          appointmentId: appointment.id.toString(),
          responderId: user.id.toString(),
        });
      } catch (error) {
        console.error('Socket video:call_response error', error);
        socket.emit('video:error', { message: error.message || 'Unable to respond to call' });
      }
    });

    socket.on('video:call_ended', async ({ appointmentId }) => {
      try {
        if (!appointmentId) return;
        const appointment = await authorizeAppointment(appointmentId, user);
        const { room } = await ensureChatRoom({ appointmentId: appointment.id });

        socket.to(room.channelName).emit('video:call_ended', {
          appointmentId: appointment.id.toString(),
          endedBy: user.id.toString(),
        });
      } catch (error) {
        console.error('Socket video:call_ended error', error);
        socket.emit('video:error', { message: error.message || 'Unable to end call' });
      }
    });

    socket.on('disconnect', async () => {
      touchUserSocket(user.id, socket.id, 'remove');
      const roomEntries = Array.from(socket.data.rooms.entries());
      await Promise.all(
        roomEntries.map(([channelName, info]) =>
          broadcastPresence(info.roomId, channelName, info.appointmentId)
        )
      );
    });
  });
}
