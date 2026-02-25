import api from './api';

/**
 * Appointment Service - handles all appointment-related API calls
 */

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
  clinic_id,
  date,
  time,
  duration = 60,
  type = 'onsite',
  reason = 'Konsultasi gigi',
  notes = '',
  metadata = null,
}) => {
  try {
    // Build ISO datetime strings for start and end
    // Backend expects start/end in ISO 8601 format
    const startDateTime = new Date(`${date}T${time}:00+07:00`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);

    const payload = {
      dentistId: dentist_id,
      clinicBranchId: clinic_id,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      appointmentType: type, // 'virtual' or 'onsite'
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
    // Use console.warn instead of console.error to avoid LogBox red banner
    // The error is already handled gracefully by BookingFailedScreen
    console.warn('[AppointmentService] Create appointment failed:', error.response?.data?.error?.code || error.message);
    
    // Extract error message from backend response
    const errorMessage = error.response?.data?.error?.message || 
                         error.response?.data?.message || 
                         error.message ||
                         'Gagal membuat janji temu';
    
    const enhancedError = new Error(errorMessage);
    enhancedError.code = error.response?.data?.error?.code || 'unknown';
    enhancedError.status = error.response?.status;
    enhancedError.originalError = error;
    throw enhancedError;
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
    console.error('[AppointmentService] Fetch appointments error:', error.response?.data || error.message);
    throw error;
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
    console.error('[AppointmentService] Fetch appointment error:', error.response?.data || error.message);
    throw error;
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
    console.error('[AppointmentService] Cancel appointment error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Reschedule an appointment
 * @param {number|string} id - Appointment ID
 * @param {Object} data - New schedule data
 * @param {string} data.date - New date in YYYY-MM-DD format
 * @param {string} data.time - New time in HH:mm format
 * @returns {Promise<Object>} Updated appointment data
 */
export const rescheduleAppointment = async (id, { date, time }) => {
  try {
    console.log('[AppointmentService] Rescheduling appointment:', id, { date, time });
    const response = await api.patch(`/appointments/${id}/reschedule`, { date, time });
    return response.data;
  } catch (error) {
    console.error('[AppointmentService] Reschedule appointment error:', error.response?.data || error.message);
    throw error;
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
    console.error('[AppointmentService] Fetch slots error:', error.response?.data || error.message);
    throw error;
  }
};

export default {
  createAppointment,
  getAppointments,
  getUpcomingAppointments,
  getCompletedAppointments,
  getAppointmentById,
  cancelAppointment,
  rescheduleAppointment,
  getAvailableSlots,
};
