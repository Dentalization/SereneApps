import { authHttp } from '../utils/httpClient';

export async function fetchAppointments(params = {}) {
  const { data } = await authHttp.get('/appointments', { params });
  return data;
}

export async function rescheduleAppointment(appointmentId, payload) {
  const { data } = await authHttp.patch(`/appointments/${appointmentId}/reschedule`, payload);
  return data;
}

export async function cancelAppointment(appointmentId, payload) {
  const { data } = await authHttp.patch(`/appointments/${appointmentId}/cancel`, payload);
  return data;
}
