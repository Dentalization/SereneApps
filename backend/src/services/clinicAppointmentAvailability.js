const JAKARTA_OFFSET = '+07:00';
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function dayKeyForDate(date) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error('INVALID_DATE');
    error.status = 400;
    throw error;
  }
  return DAY_KEYS[parsed.getUTCDay()];
}

function parseTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return (hours * 60) + minutes;
}

function parseDaySchedule(value) {
  if (!value || String(value).toLowerCase() === 'closed') return { isOpen: false };

  if (typeof value === 'object') {
    if (value.isOpen === false) return { isOpen: false };
    const openMinutes = parseTime(value.open);
    const closeMinutes = parseTime(value.close);
    return openMinutes !== null && closeMinutes > openMinutes
      ? { isOpen: true, openMinutes, closeMinutes }
      : { isOpen: false };
  }

  const [open, close] = String(value).split('-').map((item) => item.trim());
  const openMinutes = parseTime(open);
  const closeMinutes = parseTime(close);
  return openMinutes !== null && closeMinutes > openMinutes
    ? { isOpen: true, openMinutes, closeMinutes }
    : { isOpen: false };
}

function normalizeHours(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function resolveDailyWindow({ date, clinicHours, dentistHours }) {
  const dayKey = dayKeyForDate(date);
  const normalizedClinicHours = normalizeHours(clinicHours) || {};
  const normalizedDentistHours = normalizeHours(dentistHours);
  const clinicWindow = parseDaySchedule(normalizedClinicHours[dayKey]);
  if (!clinicWindow.isOpen) {
    return { dayKey, isOpen: false, reason: 'CLINIC_CLOSED' };
  }

  const dentistWindow = normalizedDentistHours
    ? parseDaySchedule(normalizedDentistHours[dayKey])
    : clinicWindow;
  if (!dentistWindow.isOpen) {
    return { dayKey, isOpen: false, reason: 'DENTIST_CLOSED' };
  }

  const openMinutes = Math.max(clinicWindow.openMinutes, dentistWindow.openMinutes);
  const closeMinutes = Math.min(clinicWindow.closeMinutes, dentistWindow.closeMinutes);
  if (openMinutes >= closeMinutes) {
    return { dayKey, isOpen: false, reason: 'NO_OVERLAPPING_HOURS' };
  }

  return { dayKey, isOpen: true, openMinutes, closeMinutes };
}

function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function buildClinicAvailability({
  date,
  durationMinutes,
  clinicHours,
  dentistHours,
  appointments = [],
  now = new Date(),
  includeMeta = false
}) {
  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration < 15 || duration > 120) {
    const error = new Error('INVALID_DURATION');
    error.status = 400;
    throw error;
  }

  const window = resolveDailyWindow({ date, clinicHours, dentistHours });
  if (!window.isOpen) {
    const result = { slots: [], dayKey: window.dayKey, reason: window.reason };
    return includeMeta ? result : result.slots;
  }

  const slots = [];
  let futureSlotCount = 0;
  for (let cursor = window.openMinutes; cursor + duration <= window.closeMinutes; cursor += duration) {
    const time = formatTime(cursor);
    const endTime = formatTime(cursor + duration);
    const startsAt = new Date(`${date}T${time}:00${JAKARTA_OFFSET}`);
    const endsAt = new Date(`${date}T${endTime}:00${JAKARTA_OFFSET}`);
    if (startsAt <= now) continue;
    futureSlotCount += 1;

    const overlaps = appointments.some((appointment) => {
      const appointmentStart = new Date(appointment.startsAt ?? appointment.starts_at);
      const appointmentEnd = new Date(appointment.endsAt ?? appointment.ends_at);
      return startsAt < appointmentEnd && endsAt > appointmentStart;
    });
    if (overlaps) continue;

    slots.push({
      id: `${date}-${time}`,
      time,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      durationMinutes: duration,
      isAvailable: true
    });
  }

  const reason = slots.length
    ? null
    : futureSlotCount === 0
      ? 'NO_FUTURE_SLOTS'
      : 'NO_AVAILABLE_SLOTS';
  const result = { slots, dayKey: window.dayKey, reason };
  return includeMeta ? result : result.slots;
}

export const CLINIC_AVAILABILITY_TIMEZONE = 'Asia/Jakarta';
