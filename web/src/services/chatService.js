import { authHttp } from '../utils/httpClient';

export async function fetchConversations() {
  const { data } = await authHttp.get('/communications/rooms');
  return data?.conversations || [];
}

export async function fetchMessages(appointmentId, params = {}) {
  const { data } = await authHttp.get(`/communications/appointments/${appointmentId}/chat/messages`, {
    params
  });
  return data;
}

export async function markConversationRead(appointmentId) {
  const { data } = await authHttp.patch(`/communications/appointments/${appointmentId}/chat/read`);
  return data;
}

export async function sendTextMessage(appointmentId, message) {
  const { data } = await authHttp.post(`/communications/appointments/${appointmentId}/chat/messages`, {
    message,
    messageType: 'text'
  });
  return data?.message;
}

export async function uploadAttachment(appointmentId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await authHttp.post(`/communications/appointments/${appointmentId}/chat/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return data?.message;
}

export async function fetchVideoToken(appointmentId, role = 'publisher') {
  const { data } = await authHttp.post(`/communications/appointments/${appointmentId}/video/token`, { role });
  return data;
}
