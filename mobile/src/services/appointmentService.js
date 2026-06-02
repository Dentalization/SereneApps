import api from './api';

/**
 * Appointment Service - handles all appointment-related API calls
 */

const normalizeAppointmentError = (error, fallbackMessage) => {
  const status = error?.response?.status;
  const backendCode = error?.response?.data?.error?.code;
  const backendMessage = error?.response?.data?.error?.message;
  const genericMessage = error?.response?.data?.message;
  const rawMessage = error?.message;

  let message = backendMessage || genericMessage || fallbackMessage;

  if (!error?.response) {
    message = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  } else if (status === 408 || status === 504 || rawMessage?.toLowerCase?.().includes('timeout')) {
    message = 'Permintaan memakan waktu terlalu lama. Silakan coba lagi.';
  } else if (backendCode === 'cancel_window_elapsed') {
    message = backendMessage || 'Pembatalan hanya diperbolehkan hingga beberapa jam sebelum janji.';
  }

  if (__DEV__) {
    console.warn('[AppointmentService] API issue:', backendCode || status || rawMessage);
  }

  const enhancedError = new Error(message || fallbackMessage || 'Terjadi kesalahan');
  enhancedError.code = backendCode || 'unknown';
  enhancedError.status = status;
  enhancedError.originalError = error;
  enhancedError.responseData = error?.response?.data;
  return enhancedError;
};

/**
 * Create a new appointment
 * @param {Object} data - Appointment data
 * @param {number|string} data.dentist_id - Dentist user ID
 * @param {number|string} data.clinic_id - Clinic profile/branch ID
 * @param {string} data.date - Date in YYYY-MM-DD format
 * @param {string} data.time - Time in HH:mm format
 * @param {number} data.duration - Duration in minutes (default: 60)
 * @param {string} data.type - Appointment type: 'virtual' or 'onsite'
 * @param {string} data.reason - Reason for appointment
 * @param {string} data.notes - Additional notes
 * @returns {Promise<Object>} Created appointment data
 */
export const createAppointment = async ({
  dentist_id,
  dentistId,
  clinic_id,
  clinicBranchId,
  date,
  time,
  startsAt,
  endsAt,
  duration = 60,
  type = 'onsite',
  appointmentType,
  reason = 'Konsultasi gigi',
  notes = '',
  metadata = null,
}) => {
  try {
    const resolvedDentistId = dentist_id ?? dentistId;
    const resolvedClinicId = clinic_id ?? clinicBranchId;
    const resolvedType = appointmentType || type;
    const startDateTime = startsAt
      ? new Date(startsAt)
      : new Date(`${date}T${time}:00+07:00`);
    const endDateTime = endsAt
      ? new Date(endsAt)
      : new Date(startDateTime.getTime() + duration * 60 * 1000);

    if (!resolvedDentistId) {
      throw new Error('Dokter belum dipilih.');
    }
    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      throw new Error('Waktu janji temu tidak valid.');
    }

    const payload = {
      dentistId: resolvedDentistId,
      clinicBranchId: resolvedClinicId,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      appointmentType: resolvedType, // 'virtual' or 'onsite'
      reason,
      notes,
      metadata,
    };

    console.log('[AppointmentService] Creating appointment:', payload);

    const response = await api.post('/appointments', payload);

    console.log('[AppointmentService] Appointment created:', response.data);
    
    // Backend returns { appointment: {...}, dentist: {...} }
    return {
      success: true,
      data: response.data?.appointment || response.data,
      dentist: response.data?.dentist,
    };
  } catch (error) {
    throw normalizeAppointmentError(error, 'Gagal membuat janji temu');
  }
};

/**
 * Get list of appointments for authenticated user
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Items per page (default: 50)
 * @param {string} params.status - Filter by status (scheduled, completed, cancelled) - comma separated
 * @param {string} params.from - Filter start date (ISO string)
 * @param {string} params.to - Filter end date (ISO string)
 * @param {string} params.order - Sort order (asc, desc)
 * @returns {Promise<Object>} Appointments list with summary
 */
export const getAppointments = async ({
  limit = 50,
  status = '',
  from = '',
  to = '',
  order = 'asc',
} = {}) => {
  try {
    console.log('[AppointmentService] Fetching appointments:', { limit, status });

    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('view', 'patient'); // Patient view for mobile app
    if (status) params.append('status', status);
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (order) params.append('order', order);

    console.log('[AppointmentService] Request URL:', `/appointments?${params.toString()}`);
    
    const response = await api.get(`/appointments?${params.toString()}`);

    // Backend returns: { appointments: [...], summary: {...}, view: 'patient' }
    const appointments = response.data?.appointments || [];
    const summary = response.data?.summary || { total: 0, byStatus: {} };

    console.log('[AppointmentService] Fetched appointments:', appointments.length);
    return { 
      success: true,
      data: appointments,
      summary,
    };
  } catch (error) {
    throw normalizeAppointmentError(error, 'Gagal memuat daftar janji temu');
  }
};

/**
 * Get upcoming appointments (status = scheduled, starting from now)
 * @returns {Promise<Object>} Upcoming appointments
 */
export const getUpcomingAppointments = async () => {
  const today = new Date().toISOString().split('T')[0];
  return getAppointments({
    status: 'scheduled',
    startDate: today,
    sortOrder: 'asc',
  });
};

/**
 * Get completed appointments (status = completed)
 * @returns {Promise<Object>} Completed appointments
 */
export const getCompletedAppointments = async () => {
  return getAppointments({
    status: 'completed',
    sortOrder: 'desc',
  });
};

/**
 * Get a single appointment by ID
 * @param {number|string} id - Appointment ID
 * @returns {Promise<Object>} Appointment data
 */
export const getAppointmentById = async (id) => {
  try {
    console.log('[AppointmentService] Fetching appointment:', id, 'Type:', typeof id);
    const response = await api.get(`/appointments/${id}`);
    console.log('[AppointmentService] Fetched appointment successfully:', response.data?.appointment?.id);
    // Backend returns { appointment: {...} }
    return { data: response.data.appointment };
  } catch (error) {
    throw normalizeAppointmentError(error, 'Gagal memuat detail janji temu');
  }
};

export const getAppointmentClinicalSummary = async (id) => {
  try {
    const response = await api.get(`/appointments/${id}/clinical-summary`);
    return response.data;
  } catch (error) {
    throw normalizeAppointmentError(error, 'Gagal memuat ringkasan konsultasi');
  }
};

export const acknowledgeAppointmentClinicalSummary = async (id) => {
  try {
    const response = await api.post(`/appointments/${id}/clinical-summary/acknowledge`);
    return response.data;
  } catch (error) {
    throw normalizeAppointmentError(error, 'Gagal mengonfirmasi ringkasan konsultasi');
  }
};

export const getPreSessionHealthForm = async (id) => {
  try {
    const response = await api.get(`/appointments/${id}/pre-session-health-form`);
    return response.data;
  } catch (error) {
    throw normalizeAppointmentError(error, 'Gagal memuat formulir pra-sesi');
  }
};

export const savePreSessionHealthForm = async (id, payload) => {
  try {
    const response = await api.put(`/appointments/${id}/pre-session-health-form`, payload);
    return response.data;
  } catch (error) {
    throw normalizeAppointmentError(error, 'Gagal menyimpan formulir pra-sesi');
  }
};

/**
 * Cancel an appointment
 * @param {number|string} id - Appointment ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Updated appointment data
 */
export const cancelAppointment = async (id, reason = '') => {
  try {
    console.log('[AppointmentService] Cancelling appointment:', id);
    const response = await api.patch(`/appointments/${id}/cancel`, { reason });
    console.log('[AppointmentService] Appointment cancelled successfully:', response.data?.appointment?.id);
    // Backend returns { appointment: {...} }
    return { data: response.data.appointment };
  } catch (error) {
    throw normalizeAppointmentError(error, 'Gagal membatalkan janji temu');
  }
};

/**
 * Reschedule an appointment
 * @param {number|string} id - Appointment ID
 * @param {Object} data - New schedule data
 * @param {string} data.startsAt - New start time (ISO string)
 * @param {string} data.endsAt - New end time (ISO string)
 * @param {string} [data.reason] - Reason for rescheduling
 * @returns {Promise<Object>} Updated appointment data
 */
export const rescheduleAppointment = async (id, { startsAt, endsAt, reason }) => {
  try {
    console.log('[AppointmentService] Rescheduling appointment:', id, { startsAt, endsAt, reason });
    const response = await api.patch(`/appointments/${id}/reschedule`, { startsAt, endsAt, reason });
    return response.data;
  } catch (error) {
    throw normalizeAppointmentError(error, 'Gagal mengubah jadwal janji temu');
  }
};

/**
 * Get appointment configuration limits and defaults from backend
 * @returns {Promise<Object>} Configuration details
 */
export const getAppointmentConfig = async () => {
  try {
    const response = await api.get('/appointments/config');
    return response.data?.data ?? response.data;
  } catch (error) {
    throw normalizeAppointmentError(error, 'Gagal memuat konfigurasi janji temu');
  }
};

/**
 * Get available slots for a dentist on a specific date
 * @param {number|string} dentistId - Dentist user ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Available slots
 */
export const getAvailableSlots = async (dentistId, date) => {
  try {
    console.log('[AppointmentService] Fetching slots:', { dentistId, date });
    const response = await api.get(`/appointments/availability?dentist_id=${dentistId}&date=${date}`);
    return response.data;
  } catch (error) {
    throw normalizeAppointmentError(error, 'Gagal memuat slot jadwal');
  }
};

export default {
  createAppointment,
  getAppointments,
  getUpcomingAppointments,
  getCompletedAppointments,
  getAppointmentById,
  getAppointmentClinicalSummary,
  acknowledgeAppointmentClinicalSummary,
  getPreSessionHealthForm,
  cancelAppointment,
  rescheduleAppointment,
  getAppointmentConfig,
  savePreSessionHealthForm,
  getAvailableSlots,
};
