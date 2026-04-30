import { ensureCommunicationResourcesForAppointment } from '../communications.js';

export async function provisionConversationForAppointment(appointmentId) {
  const resources = await ensureCommunicationResourcesForAppointment({
    appointmentId,
    reason: 'conversation_orchestrator'
  });

  return {
    conversationSid: resources.conversationSid,
    chatRoomId: resources.chatRoom.id,
    roomName: resources.roomName,
    videoRoomSid: resources.videoRoomSid
  };
}
