import { PrismaClient } from '@prisma/client';
import ConversationsAdapter from './conversationsAdapter.js';

const prisma = new PrismaClient();
const adapter = new ConversationsAdapter();

export async function provisionConversationForAppointment(appointmentId) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: BigInt(appointmentId) },
    include: {
      patient: { select: { id: true, name: true, email: true } },
      dentist: { select: { id: true, name: true } } // Schema shows dentist relation points directly to User
    }
  });

  if (!appointment) {
    throw { code: 'APPOINTMENT_NOT_FOUND' };
  }

  // 2. Check chat_rooms
  const existingChatRoom = await prisma.chatRoom.findUnique({
    where: { appointmentId: BigInt(appointmentId) }
  });

  if (existingChatRoom && existingChatRoom.twilio_conversation_sid) {
    return { 
      conversationSid: existingChatRoom.twilio_conversation_sid, 
      chatRoomId: existingChatRoom.id 
    };
  }

  // 3. Call adapter.createConversation
  const { sid: conversationSid } = await adapter.createConversation({
    uniqueName: `appointment-${appointmentId}`,
    friendlyName: `Konsultasi #${appointmentId}`
  });

  // 4. Call adapter.addParticipant for patient
  await adapter.addParticipant({
    conversationSid,
    identity: String(appointment.patient.id),
    friendlyName: appointment.patient.name
  });

  // 5. Call adapter.addParticipant for dentist
  // (Using appointment.dentist.name because the schema indicates 'dentist' is a User directly)
  await adapter.addParticipant({
    conversationSid,
    identity: String(appointment.dentist.id),
    friendlyName: appointment.dentist.name
  });

  // 6. Upsert chat_rooms
  const chatRoom = await prisma.chatRoom.upsert({
    where: { appointmentId: BigInt(appointmentId) },
    update: { twilio_conversation_sid: conversationSid },
    create: {
      appointmentId: BigInt(appointmentId),
      channelName: `appointment-${appointmentId}`,
      twilio_conversation_sid: conversationSid
    }
  });

  // 7. Upsert chat_room_members for both
  await Promise.all([
    prisma.chatRoomMember.upsert({
      where: { 
        chatRoomId_userId: { 
          chatRoomId: chatRoom.id, 
          userId: appointment.patient.id 
        } 
      },
      update: {},
      create: {
        chatRoomId: chatRoom.id,
        userId: appointment.patient.id,
        role: 'patient'
      }
    }),
    prisma.chatRoomMember.upsert({
      where: { 
        chatRoomId_userId: { 
          chatRoomId: chatRoom.id, 
          userId: appointment.dentist.id 
        } 
      },
      update: {},
      create: {
        chatRoomId: chatRoom.id,
        userId: appointment.dentist.id,
        role: 'dentist'
      }
    })
  ]);

  // 8. Return result
  return { 
    conversationSid, 
    chatRoomId: chatRoom.id 
  };
}
