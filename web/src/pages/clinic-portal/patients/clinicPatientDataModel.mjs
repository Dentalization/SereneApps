const ACTIVE_APPOINTMENT_STATUSES = new Set(['scheduled', 'confirmed', 'in-progress']);

const normalizeId = (value) => (value === null || value === undefined ? '' : String(value));

const readAppointmentDate = (appointment) => {
  const raw = appointment?.startsAt || appointment?.date;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export function resolveAnalyticsDateRange({ period = 'all', year, month, now = new Date() } = {}) {
  const today = startOfDay(now);
  if (period === 'today') {
    return { start: today, end: new Date(today.getTime() + 86400000 - 1) };
  }
  if (period === 'week') {
    return { start: new Date(today.getTime() - (6 * 86400000)), end: now };
  }
  if (period === 'month') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
  if (period === 'year') {
    return { start: new Date(now.getFullYear(), 0, 1), end: now };
  }
  if (period === 'custom') {
    const selectedYear = Number.isInteger(Number(year)) ? Number(year) : now.getFullYear();
    const selectedMonth = Number.isInteger(Number(month)) ? Number(month) : now.getMonth();
    return {
      start: new Date(selectedYear, selectedMonth, 1),
      end: new Date(selectedYear, selectedMonth + 1, 1, 0, 0, 0, -1),
    };
  }
  return { start: null, end: null };
}

export function scopeClinicPatientData({
  patients = [],
  appointments = [],
  selectedDentist = 'all',
  patientType = 'all',
  treatmentType = 'all',
  start = null,
  end = null,
} = {}) {
  const dentistId = normalizeId(selectedDentist);
  const treatmentKey = String(treatmentType || 'all').trim().toLowerCase();
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (startDate && Number.isNaN(startDate.getTime())) throw new Error('INVALID_START_DATE');
  if (endDate && Number.isNaN(endDate.getTime())) throw new Error('INVALID_END_DATE');
  if (startDate && endDate && startDate > endDate) throw new Error('INVALID_DATE_RANGE');

  const scopedAppointments = appointments.filter((appointment) => {
    const appointmentDentistId = normalizeId(appointment?.dentistId || appointment?.doctorId);
    if (dentistId !== 'all' && appointmentDentistId !== dentistId) return false;

    const treatment = String(appointment?.treatment || appointment?.reason || '').trim().toLowerCase();
    if (treatmentKey !== 'all' && treatment !== treatmentKey) return false;

    const appointmentDate = readAppointmentDate(appointment);
    if ((startDate || endDate) && !appointmentDate) return false;
    if (startDate && appointmentDate < startDate) return false;
    if (endDate && appointmentDate > endDate) return false;
    return true;
  });

  const hasAppointmentScope = dentistId !== 'all' || treatmentKey !== 'all' || Boolean(startDate || endDate);
  const scopedPatientIds = new Set(scopedAppointments.map((appointment) => normalizeId(appointment?.patientId)));
  const scopedPatients = patients.filter((patient) => {
    if (patientType !== 'all' && patient?.status !== patientType) return false;
    if (hasAppointmentScope) return scopedPatientIds.has(normalizeId(patient?.id));
    return true;
  });

  return { patients: scopedPatients, appointments: scopedAppointments };
}

export function listTreatmentTypes(appointments = []) {
  return [...new Set(
    appointments
      .map((appointment) => String(appointment?.treatment || appointment?.reason || '').trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'id'));
}

export function getPatientDentistIds(patient) {
  const ids = Array.isArray(patient?.doctorIds) ? patient.doctorIds : [patient?.doctorId];
  return ids.map(normalizeId).filter(Boolean);
}

export function isActiveAppointment(appointment, now = new Date()) {
  const date = readAppointmentDate(appointment);
  return Boolean(date && date >= now && ACTIVE_APPOINTMENT_STATUSES.has(String(appointment?.status || '').toLowerCase()));
}

export function getJakartaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export { normalizeId, readAppointmentDate };
