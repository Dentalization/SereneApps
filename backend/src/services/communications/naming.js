const APPOINTMENT_ROOM_PREFIX = 'appointment';

export function normalizeAppointmentId(value) {
  const raw = value?.toString?.() ?? String(value || '');
  if (!/^\d+$/.test(raw)) {
    const error = new Error('INVALID_APPOINTMENT_ID');
    error.status = 400;
    throw error;
  }
  return raw;
}

export function appointmentScopedRoomName(appointmentId) {
  return `${APPOINTMENT_ROOM_PREFIX}-${normalizeAppointmentId(appointmentId)}`;
}

export function chatChannelNameForAppointment(appointmentId) {
  return appointmentScopedRoomName(appointmentId);
}

export function videoRoomNameForAppointment(appointmentId) {
  return appointmentScopedRoomName(appointmentId);
}

export function parseAppointmentIdFromRoomName(roomName) {
  const match = String(roomName || '').match(/^appointment-(\d+)$/);
  return match ? match[1] : null;
}

