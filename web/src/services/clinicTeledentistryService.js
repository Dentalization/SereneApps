import { authHttp } from '../utils/httpClient';

export async function fetchClinicTeledentistrySessions(params = {}) {
  const { data } = await authHttp.get('/clinic/teledentistry/sessions', { params });
  return data;
}

export async function fetchClinicTeledentistrySessionCount(params = {}) {
  const { data } = await authHttp.get('/clinic/teledentistry/sessions/count', { params });
  return data;
}

export async function fetchClinicTeledentistrySummary(appointmentId) {
  const { data } = await authHttp.get(`/clinic/teledentistry/appointments/${appointmentId}/summary`);
  return data;
}

export async function fetchClinicTeledentistryMessages(appointmentId, params = {}) {
  const { data } = await authHttp.get(`/clinic/teledentistry/appointments/${appointmentId}/messages`, { params });
  return data;
}

export async function fetchClinicCommunicationAuditLog(params = {}) {
  const { data } = await authHttp.get('/clinic/teledentistry/audit-log', { params });
  return data;
}

export async function fetchClinicObserverToken(appointmentId) {
  const { data } = await authHttp.get(`/communications/appointments/${appointmentId}/token`, {
    params: { mode: 'observer' }
  });
  return data;
}
