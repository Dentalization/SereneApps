import { authHttp } from '../utils/httpClient';
import { publishPortalInvalidation } from '../collaboration/portalCollaboration.mjs';

export async function fetchAppointments(params = {}) {
  const { data } = await authHttp.get('/appointments', { params });
  return data;
}

export async function rescheduleAppointment(appointmentId, payload) {
  const { data } = await authHttp.patch(`/appointments/${appointmentId}/reschedule`, payload);
  publishPortalInvalidation('appointment:updated', { source: 'appointment-service:reschedule' });
  return data;
}

export async function cancelAppointment(appointmentId, payload) {
  const { data } = await authHttp.patch(`/appointments/${appointmentId}/cancel`, payload);
  publishPortalInvalidation('appointment:cancelled', { source: 'appointment-service:cancel' });
  return data;
}

export async function updateAppointmentStatus(appointmentId, action, payload = {}) {
  const endpointByAction = {
    confirm: 'confirm',
    checkin: 'check-in',
    'check-in': 'check-in',
    start: 'start',
    complete: 'complete',
    noshow: 'no-show',
    'no-show': 'no-show'
  };
  const endpoint = endpointByAction[action];
  if (!endpoint) {
    throw new Error(`Unsupported appointment status action: ${action}`);
  }
  const { data } = await authHttp.patch(`/appointments/${appointmentId}/${endpoint}`, payload);
  publishPortalInvalidation('appointment:updated', { source: `appointment-service:${endpoint}` });
  return data;
}
