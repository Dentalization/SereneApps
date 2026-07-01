import { authHttp } from '../utils/httpClient';

export async function createSpecialistCase(payload) {
  const { data } = await authHttp.post('/specialist-workspace/cases', payload);
  return data.case;
}

export async function listSpecialistCases(params = {}) {
  const { data } = await authHttp.get('/specialist-workspace/cases', { params });
  return data.cases || [];
}

export async function listPatientXcoreStudies(patientId) {
  const { data } = await authHttp.get('/specialist-workspace/xcore/studies', {
    params: { patientId },
  });
  return data.studies || [];
}

export async function getSpecialistCase(caseId) {
  const { data } = await authHttp.get(`/specialist-workspace/cases/${caseId}`);
  return data.case;
}

export async function addSpecialistCaseNote(caseId, content) {
  const { data } = await authHttp.post(`/specialist-workspace/cases/${caseId}/notes`, {
    content,
  });
  return data.note;
}

export async function updateSpecialistCaseStatus(caseId, status, completionSummary = null) {
  const { data } = await authHttp.patch(`/specialist-workspace/cases/${caseId}/status`, {
    status,
    ...(completionSummary ? { completionSummary } : {}),
  });
  return data.case;
}

export async function getClinicPatientSpecialistCaseSummary(patientId) {
  const { data } = await authHttp.get(
    `/specialist-workspace/clinic/patients/${patientId}/case-summary`,
  );
  return data.cases || [];
}
