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

export async function uploadAttachment(appointmentId, file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await authHttp.post(`/communications/appointments/${appointmentId}/chat/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: options.onUploadProgress
  });
  return data?.message;
}

export async function fetchAppointmentCommunicationsToken(appointmentId, params = {}) {
  const { data } = await authHttp.get(`/communications/appointments/${appointmentId}/token`, { params });
  return data;
}

export async function fetchVideoToken(appointmentId) {
  try {
    const data = await fetchAppointmentCommunicationsToken(appointmentId);
    return {
      ...data,
      token: data.video?.token || data.videoToken || data.token,
      roomName: data.video?.roomName || data.roomName || data.channelName,
      roomSid: data.video?.roomSid || data.roomSid,
      waitingRoom: data.waitingRoom,
    };
  } catch (err) {
    throw { code: 'VIDEO_TOKEN_FETCH_FAILED', message: err.message };
  }
}

export async function recordCommunicationClientEvent(appointmentId, eventType, metadata = {}) {
  const { data } = await authHttp.post(`/communications/appointments/${appointmentId}/events`, {
    eventType,
    provider: 'web',
    metadata
  });
  return data?.event || null;
}

export async function fetchClinicalSummary(appointmentId) {
  const { data } = await authHttp.get(`/appointments/${appointmentId}/clinical-summary`);
  return data;
}

export async function saveClinicalSummaryDraft(appointmentId, payload) {
  const { data } = await authHttp.put(`/appointments/${appointmentId}/clinical-summary/draft`, payload);
  return data;
}

export async function finalizeClinicalSummary(appointmentId, payload) {
  const { data } = await authHttp.post(`/appointments/${appointmentId}/clinical-summary/finalize`, payload);
  return data;
}

export async function acknowledgeClinicalSummary(appointmentId) {
  const { data } = await authHttp.post(`/appointments/${appointmentId}/clinical-summary/acknowledge`);
  return data;
}

export async function amendClinicalSummary(appointmentId, payload) {
  const { data } = await authHttp.post(`/appointments/${appointmentId}/clinical-summary/amend`, payload);
  return data;
}

export async function uploadSummaryAttachment(appointmentId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await authHttp.post(`/appointments/${appointmentId}/clinical-summary/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return data;
}

export async function fetchPreSessionHealthForm(appointmentId) {
  const { data } = await authHttp.get(`/appointments/${appointmentId}/pre-session-health-form`);
  return data;
}

export async function listCommunicationParticipants(appointmentId) {
  const { data } = await authHttp.get(`/communications/appointments/${appointmentId}/participants`);
  return data?.participants || [];
}

export async function inviteCommunicationParticipant(appointmentId, payload) {
  const { data } = await authHttp.post(`/communications/appointments/${appointmentId}/participants/invite`, payload);
  return data;
}

export async function revokeCommunicationParticipant(appointmentId, participantId) {
  const { data } = await authHttp.post(`/communications/appointments/${appointmentId}/participants/${participantId}/revoke`);
  return data?.participant;
}

export async function resendCommunicationParticipantInvite(appointmentId, participantId) {
  const { data } = await authHttp.post(`/communications/appointments/${appointmentId}/participants/${participantId}/resend`);
  return data;
}

export async function regenerateCommunicationParticipantAccess(appointmentId, participantId) {
  const { data } = await authHttp.post(`/communications/appointments/${appointmentId}/participants/${participantId}/regenerate-access`);
  return data;
}

export async function kickCommunicationParticipant(appointmentId, participantId) {
  const { data } = await authHttp.post(`/communications/appointments/${appointmentId}/participants/${participantId}/kick`);
  return data;
}

export async function hardEndConsultationRoom(appointmentId) {
  const { data } = await authHttp.post(`/communications/appointments/${appointmentId}/video/end`);
  return data;
}

export async function fetchOperationalCommunicationDiagnostics(params = {}) {
  const { data } = await authHttp.get('/admin/communications/appointments', { params });
  return data;
}

export async function exportCommunicationAudit(appointmentId, format = 'csv') {
  const { data } = await authHttp.get(`/admin/communications/appointments/${appointmentId}/audit-export`, {
    params: { format },
    responseType: 'blob'
  });
  return data;
}

export async function fetchCommunicationDiagnostics(appointmentId) {
  const { data } = await authHttp.get(`/admin/communications/appointments/${appointmentId}/diagnostics`);
  return data;
}

export async function fetchCommunicationTimeline(appointmentId) {
  const { data } = await authHttp.get(`/admin/communications/appointments/${appointmentId}/timeline`);
  return data;
}

export async function reconcileCommunicationDiagnostics(appointmentId) {
  const { data } = await authHttp.post(`/admin/communications/appointments/${appointmentId}/reconcile`);
  return data;
}
