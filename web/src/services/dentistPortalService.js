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

export async function createDentistPatient(payload) {
  const { data } = await authHttp.post('/dentist-portal/patients', payload);
  return data.patient;
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

export async function getDentistDashboardContinuity() {
  const { data } = await authHttp.get('/dentist-portal/dashboard/continuity');
  return data;
}

export async function getPatientEmrRecords(patientId) {
  const { data } = await authHttp.get(`/dentist-portal/patients/${patientId}/emr-records`);
  return data.emrRecords || [];
}

export async function createPatientEmrRecord(patientId, payload) {
  const { data } = await authHttp.post(`/dentist-portal/patients/${patientId}/emr-records`, payload);
  return data.emrRecord;
}

export async function uploadPatientEmrConsent(patientId, recordId, file) {
  const formData = new FormData();
  formData.append('consentFile', file);
  const { data } = await authHttp.post(
    `/dentist-portal/patients/${patientId}/emr-records/${recordId}/consent`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data.emrRecord;
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

// ==========================================
// TREATMENT PLANS
// ==========================================

/**
 * Create a new treatment plan for a patient
 */
export async function createPatientTreatmentPlan(patientId, payload) {
  const { data } = await authHttp.post(`/dentist-portal/patients/${patientId}/treatment-plans`, payload);
  return data.treatmentPlan;
}

/**
 * Get all treatment plans for a patient
 */
export async function getPatientTreatmentPlans(patientId) {
  const { data } = await authHttp.get(`/dentist-portal/patients/${patientId}/treatment-plans`);
  return data.treatmentPlans || [];
}

/**
 * Update an existing treatment plan
 */
export async function updatePatientTreatmentPlan(patientId, planId, payload) {
  const { data } = await authHttp.put(`/dentist-portal/patients/${patientId}/treatment-plans/${planId}`, payload);
  return data.treatmentPlan;
}

export async function getDentistTreatmentPlan(planId) {
  const { data } = await authHttp.get(`/dentist-portal/treatment-plans/${planId}`);
  return data.treatmentPlan;
}

export async function patchDentistTreatmentPlan(planId, payload) {
  const { data } = await authHttp.patch(`/dentist-portal/treatment-plans/${planId}`, payload);
  return data.treatmentPlan;
}

export async function sendPatientTreatmentPlan(planId) {
  const { data } = await authHttp.post(`/dentist-portal/treatment-plans/${planId}/send`);
  return data.treatmentPlan;
}

export async function addTreatmentPlanItem(planId, payload) {
  const { data } = await authHttp.post(`/dentist-portal/treatment-plans/${planId}/items`, payload);
  return data;
}

export async function patchTreatmentPlanItem(planId, itemId, payload) {
  const { data } = await authHttp.patch(`/dentist-portal/treatment-plans/${planId}/items/${itemId}`, payload);
  return data;
}

export async function deleteTreatmentPlanItem(planId, itemId) {
  const { data } = await authHttp.delete(`/dentist-portal/treatment-plans/${planId}/items/${itemId}`);
  return data;
}

/**
 * Complete / update a single treatment item (supports image upload)
 * @param {string} patientId
 * @param {string} planId
 * @param {string} itemId
 * @param {{ resultNotes?: string, actualCost?: number, status?: string, image?: File }} payload
 */
export async function completeTreatmentItem(patientId, planId, itemId, payload) {
  const formData = new FormData();
  if (payload.resultNotes !== undefined) formData.append('resultNotes', payload.resultNotes);
  if (payload.actualCost !== undefined) formData.append('actualCost', String(payload.actualCost));
  if (payload.status) formData.append('status', payload.status);
  if (payload.image) formData.append('image', payload.image);

  const { data } = await authHttp.put(
    `/dentist-portal/patients/${patientId}/treatment-plans/${planId}/items/${itemId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data.treatmentPlan;
}

// ==========================================
// NOTIFICATIONS
// ==========================================

export async function getNotifications(params = {}) {
  const { data } = await authHttp.get('/notifications', { params });
  return data;
}

export async function markNotificationAsRead(id) {
  const { data } = await authHttp.patch(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsAsRead() {
  const { data } = await authHttp.patch('/notifications/read-all');
  return data;
}
