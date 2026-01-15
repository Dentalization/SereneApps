import { authHttp } from '../utils/httpClient';

// ==========================================
// PATIENT MANAGEMENT
// ==========================================

/**
 * Get all patients who have booked appointments with this dentist
 */
export async function getDentistPatients(params = {}) {
  const { search, status, sortBy, sortOrder, limit, offset } = params;
  const queryParams = new URLSearchParams();
  
  if (search) queryParams.append('search', search);
  if (status) queryParams.append('status', status);
  if (sortBy) queryParams.append('sortBy', sortBy);
  if (sortOrder) queryParams.append('sortOrder', sortOrder);
  if (limit) queryParams.append('limit', limit.toString());
  if (offset) queryParams.append('offset', offset.toString());
  
  const queryString = queryParams.toString();
  const url = `/dentist-portal/patients${queryString ? `?${queryString}` : ''}`;
  
  const { data } = await authHttp.get(url);
  return data;
}

/**
 * Get single patient details with appointments and AI results
 */
export async function getPatientDetails(patientId) {
  const { data } = await authHttp.get(`/dentist-portal/patients/${patientId}`);
  return data.patient;
}

/**
 * Get all AI analysis results for a specific patient
 */
export async function getPatientAIResults(patientId) {
  const { data } = await authHttp.get(`/dentist-portal/patients/${patientId}/ai-results`);
  return data;
}

// ==========================================
// SERVICES MANAGEMENT
// ==========================================

export async function getDentistServicesContext() {
  const { data } = await authHttp.get('/dentist/services/context');
  return data;
}

export async function getIndependentServices() {
  const { data } = await authHttp.get('/dentist/practice/services');
  return data.services || [];
}

export async function createIndependentService(payload) {
  const { data } = await authHttp.post('/dentist/practice/services', payload);
  return data.service;
}

export async function updateIndependentService(serviceId, payload) {
  const { data } = await authHttp.put(`/dentist/practice/services/${serviceId}`, payload);
  return data.service;
}

export async function deleteIndependentService(serviceId) {
  const { data } = await authHttp.delete(`/dentist/practice/services/${serviceId}`);
  return data;
}

export async function getClinicDentistServices() {
  const { data } = await authHttp.get('/dentist/clinic/services');
  return data;
}

export async function fetchDentistScheduleEntries(params = {}) {
  const { data } = await authHttp.get('/dentist-portal/schedule', { params });
  return data.entries || [];
}

export async function persistDentistScheduleEntry(payload) {
  const { data } = await authHttp.post('/dentist-portal/schedule', payload);
  return data.entry;
}
