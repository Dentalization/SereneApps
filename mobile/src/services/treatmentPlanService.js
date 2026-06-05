import api from './api';

export async function getPatientTreatmentPlans() {
  const response = await api.get('/patient/treatment-plans');
  return response.data?.treatmentPlans || [];
}

export async function getPatientTreatmentPlan(planId) {
  const response = await api.get(`/patient/treatment-plans/${planId}`);
  return response.data?.treatmentPlan;
}

export async function approveTreatmentPlan(planId) {
  const response = await api.post(`/patient/treatment-plans/${planId}/approve`);
  return response.data?.treatmentPlan;
}

export async function rejectTreatmentPlan(planId, reason) {
  const response = await api.post(`/patient/treatment-plans/${planId}/reject`, { reason });
  return response.data?.treatmentPlan;
}
