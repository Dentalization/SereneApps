const STATUS_ALIASES = Object.freeze({
  scheduled: 'pending',
  rescheduled: 'pending',
  pending: 'pending',
  check_in: 'check-in',
  checked_in: 'check-in',
  'checked-in': 'check-in',
  in_chair: 'in-chair',
  in_progress: 'in-chair',
  'in-progress': 'in-chair',
  no_show: 'no-show',
  noshow: 'no-show'
});

/** Canonical display status shared by clinic and dentist appointment views. */
export function normalizePortalAppointmentStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  return STATUS_ALIASES[normalized] || normalized;
}

/** Canonical care channel shared by clinic and dentist appointment views. */
export function normalizePortalAppointmentChannel(appointment = {}) {
  const raw = String(
    appointment.consultationType
      || appointment.metadata?.channel
      || (appointment.videoRoomRef ? 'tele' : 'clinic')
  ).toLowerCase();

  return ['virtual', 'tele', 'teledentistry', 'remote', 'online'].includes(raw)
    ? 'tele'
    : 'clinic';
}

export function getPortalAppointmentTimeRange(appointment = {}) {
  return {
    start: appointment.startsAt || appointment.starts_at || null,
    end: appointment.endsAt || appointment.ends_at || null
  };
}
