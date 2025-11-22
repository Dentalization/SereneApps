/**
 * Dentist Service
 * API calls for dentist-related operations
 */

import api from './api';

/**
 * Get nearby dentists based on user location
 * @param {Object} params - Search parameters
 * @param {number} params.latitude - User's latitude
 * @param {number} params.longitude - User's longitude
 * @param {number} [params.radius=10] - Search radius in km
 * @param {string} [params.type] - Dentist type: 'independent' or 'clinic'
 * @param {string} [params.specialization] - Filter by specialization
 * @param {number} [params.limit=20] - Number of results
 * @param {number} [params.offset=0] - Pagination offset
 * @returns {Promise<{dentists: Array, pagination: Object, search: Object}>}
 */
export async function getNearbyDentists(params) {
  const { 
    latitude, 
    longitude, 
    radius = 10, 
    type, 
    specialization,
    limit = 20,
    offset = 0 
  } = params;

  const queryParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    radius: radius.toString(),
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (type) queryParams.append('type', type);
  if (specialization) queryParams.append('specialization', specialization);

  console.log('🌐 [dentistService] Calling API:', `/dentists/nearby?${queryParams.toString()}`);
  const response = await api.get(`/dentists/nearby?${queryParams.toString()}`);
  console.log('🌐 [dentistService] Full axios response:', JSON.stringify(response.data, null, 2));
  console.log('🌐 [dentistService] response.data keys:', Object.keys(response.data || {}));
  console.log('🌐 [dentistService] response.data.success:', response.data?.success);
  console.log('🌐 [dentistService] response.data.data:', response.data?.data);
  console.log('🌐 [dentistService] response.data.data?.dentists length:', response.data?.data?.dentists?.length);
  
  // Backend returns: { success: true, data: { dentists: [...], pagination: {...}, search: {...} } }
  // Axios unwraps one level, so response.data = { success: true, data: {...} }
  // We need to return response.data.data = { dentists: [...], pagination: {...}, search: {...} }
  const result = response.data?.data ?? response.data;
  console.log('🌐 [dentistService] Returning result with keys:', Object.keys(result || {}));
  console.log('🌐 [dentistService] result.dentists length:', result?.dentists?.length);
  return result;
}

/**
 * Get dentists directory without geolocation
 */
export async function getDentistDirectory(params = {}) {
  const {
    specialization,
    dentistType,
    clinicId,
    verifiedOnly = true,
    limit = 50,
    offset = 0,
  } = params;

  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    verifiedOnly: verifiedOnly ? 'true' : 'false',
  });

  if (specialization) queryParams.append('specialization', specialization);
  if (dentistType) queryParams.append('dentistType', dentistType);
  if (clinicId) queryParams.append('clinicId', clinicId.toString());

  const response = await api.get(`/dentists?${queryParams.toString()}`);
  return response.data;
}

/**
 * Get dentist details by ID
 * @param {string|number} id - Dentist ID
 * @returns {Promise<Object>} Dentist details
 */
export async function getDentistById(id) {
  const response = await api.get(`/dentists/${id}`);
  return response.data;
}

/**
 * Get dentist's schedule
 * @param {string|number} id - Dentist ID
 * @param {string} [date] - Optional date filter
 * @param {string|number} [clinicId] - Optional clinic filter
 * @returns {Promise<Object>} Schedule data
 */
export async function getDentistSchedule(id, date, clinicId) {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (clinicId) params.append('clinicId', clinicId);

  const response = await api.get(`/dentists/${id}/schedule?${params.toString()}`);
  return response.data;
}

/**
 * Get available time slots for booking
 * @param {string|number} id - Dentist ID
 * @param {string} date - Date for booking
 * @param {string|number} clinicId - Clinic ID
 * @param {number} [duration=30] - Appointment duration in minutes
 * @returns {Promise<Object>} Available slots
 */
export async function getDentistAvailableSlots(id, date, clinicId, duration = 30) {
  const params = new URLSearchParams({
    date,
    clinicId: clinicId.toString(),
    duration: duration.toString()
  });

  const response = await api.get(`/dentists/${id}/available-slots?${params.toString()}`);
  return response.data;
}

export default {
  getNearbyDentists,
  getDentistDirectory,
  getDentistById,
  getDentistSchedule,
  getDentistAvailableSlots
};
