import { PrismaClient } from '@prisma/client';
import { buildTwilioVideoToken } from './twilioVideo.js';
import { queueNotificationEvent } from './notifications/index.js';

const prisma = new PrismaClient();

function channelNameForChat(appointmentId) {
  return `chat_${appointmentId}`;
}

function channelNameForVideo(appointmentId) {
  return `video_${appointmentId}`;
}

async function ensureChatRoomMembers(room, appointment) {
  if (!appointment) return;
  const dentistId = appointment.dentistId;
  const patientId = appointment.patientId;

  const now = new Date();

  await prisma.chatRoomMember.upsert({
    where: {
      uniq_chat_room_members_user: {
        chat_room_id: room.id,
        user_id: dentistId
      }
    },
    update: { role: 'dentist' },
    create: {
      chatRoomId: room.id,
      userId: dentistId,
      role: 'dentist',
      lastReadAt: now
    }
  });

  await prisma.chatRoomMember.upsert({
    where: {
      uniq_chat_room_members_user: {
        chat_room_id: room.id,
        user_id: patientId
      }
    },
    update: { role: 'patient' },
    create: {
      chatRoomId: room.id,
      userId: patientId,
      role: 'patient',
      lastReadAt: now
    }
  });
}

export async function ensureChatRoom({ appointmentId }) {
  const apptId = BigInt(appointmentId);
  const appointment = await prisma.appointment.findUnique({
    where: { id: apptId },
    select: {
      id: true,
      dentistId: true,
      patientId: true
    }
  });

  if (!appointment) {
    throw new Error('APPOINTMENT_NOT_FOUND');
  }

  let room = await prisma.chatRoom.findUnique({ where: { appointmentId: apptId } });
  if (!room) {
    room = await prisma.chatRoom.create({
      data: {
        appointmentId: apptId,
        channelName: channelNameForChat(apptId)
      }
    });
    await prisma.appointment.update({
      where: { id: apptId },
      data: { chatRoomRef: room.channelName }
    }).catch(() => null);
  } else {
    await prisma.appointment.update({
      where: { id: apptId, chatRoomRef: null },
      data: { chatRoomRef: room.channelName }
    }).catch(() => null);
  }

  await ensureChatRoomMembers(room, appointment);

  return { room, appointment };
}

export async function ensureVideoChannel({ appointmentId }) {
  const apptId = BigInt(appointmentId);
  const appointment = await prisma.appointment.findUnique({
    where: { id: apptId },
    select: {
      id: true,
      videoRoomRef: true
    }
  });
  if (!appointment) {
    throw new Error('APPOINTMENT_NOT_FOUND');
  }
  if (appointment.videoRoomRef) {
    return { channelName: appointment.videoRoomRef };
  }

  const channelName = channelNameForVideo(apptId);
  await prisma.appointment.update({
    where: { id: apptId },
    data: { videoRoomRef: channelName }
  });
  return { channelName };
}

export async function saveChatMessage({ appointmentId, senderId, message, messageType = 'text', fileUrl, fileName }) {
  const apptId = BigInt(appointmentId);
  const userId = BigInt(senderId);

  const appointment = await prisma.appointment.findUnique({
    where: { id: apptId },
    select: { id: true, dentistId: true, patientId: true }
  });
  if (!appointment) {
    throw new Error('APPOINTMENT_NOT_FOUND');
  }
  if (userId !== appointment.dentistId && userId !== appointment.patientId) {
    throw new Error('FORBIDDEN');
  }
  const { room } = await ensureChatRoom({ appointmentId: apptId });
  const newMessage = await prisma.chatMessage.create({
    data: {
      chatRoomId: room.id,
      senderId: userId,
      message,
      messageType,
      fileUrl,
      fileName
    },
    include: {
      sender: {
        select: { id: true, name: true, email: true, avatar_url: true }
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
      userId: userId
    },
    data: { lastReadAt: new Date() }
  });

  return {
    message: {
      id: newMessage.id.toString(),
      chatRoomId: newMessage.chatRoomId.toString(),
      senderId: newMessage.senderId.toString(),
      appointmentId: appointment.id.toString(),
      message: newMessage.message,
      messageType: newMessage.messageType,
      fileUrl: newMessage.fileUrl,
      fileName: newMessage.fileName,
      createdAt: newMessage.createdAt,
      sender: newMessage.sender
        ? {
            id: newMessage.sender.id.toString(),
            name: newMessage.sender.name,
            email: newMessage.sender.email,
            avatar: newMessage.sender.avatar_url
          }
        : null
    },
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
      }
    }
  });

  return messages
    .map(msg => ({
      id: msg.id.toString(),
      chatRoomId: msg.chatRoomId.toString(),
      senderId: msg.senderId.toString(),
      message: msg.message,
      messageType: msg.messageType,
      fileUrl: msg.fileUrl,
      fileName: msg.fileName,
      createdAt: msg.createdAt,
      sender: msg.sender
        ? {
            id: msg.sender.id.toString(),
            name: msg.sender.name,
            email: msg.sender.email,
            avatar: msg.sender.avatar_url
          }
        : null
    }))
    .reverse();
}

export async function updateLastRead({ appointmentId, userId }) {
  const apptId = BigInt(appointmentId);
  const userBigInt = BigInt(userId);
  const { room } = await ensureChatRoom({ appointmentId: apptId });
  await prisma.chatRoomMember.update({
    where: {
      uniq_chat_room_members_user: {
        chat_room_id: room.id,
        user_id: userBigInt
      }
    },
    data: { lastReadAt: new Date() }
  }).catch(() => null);
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
              sender: { select: { id: true, name: true, email: true, avatar_url: true } }
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
        lastMessage: lastMessage
          ? {
              id: lastMessage.id.toString(),
              senderId: lastMessage.senderId.toString(),
              message: lastMessage.message,
              messageType: lastMessage.messageType,
              fileUrl: lastMessage.fileUrl,
              fileName: lastMessage.fileName,
              createdAt: lastMessage.createdAt,
              sender: lastMessage.sender
                ? {
                    id: lastMessage.sender.id.toString(),
                    name: lastMessage.sender.name,
                    email: lastMessage.sender.email,
                    avatar: lastMessage.sender.avatar_url
                  }
                : null
            }
          : null,
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

  const { channelName } = await ensureVideoChannel({ appointmentId: apptId });
  const token = buildTwilioVideoToken({
    roomName: channelName,
    identity: userBigInt.toString(),
    expireSeconds
  });

  return {
    roomName: channelName,
    channelName,
    token,
    expireSeconds
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
