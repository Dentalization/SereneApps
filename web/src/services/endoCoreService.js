import { authHttp } from '../utils/httpClient';

export async function createEndoCase(payload) {
  const { data } = await authHttp.post('/specialist-workspace/endo/cases', payload);
  return data.case;
}

export async function listEndoCases(params = {}) {
  const { data } = await authHttp.get('/specialist-workspace/endo/cases', { params });
  return data.cases || [];
}

export async function getEndoCase(caseId) {
  const { data } = await authHttp.get(`/specialist-workspace/endo/cases/${caseId}`);
  return data.case;
}

export async function updateEndoCase(caseId, payload) {
  const { data } = await authHttp.patch(`/specialist-workspace/endo/cases/${caseId}`, payload);
  return data.endo;
}

export async function addEndoDiagnosticTest(caseId, payload) {
  const { data } = await authHttp.post(
    `/specialist-workspace/endo/cases/${caseId}/diagnostic-tests`,
    payload,
  );
  return data.test;
}

export async function updateEndoDiagnosticTest(caseId, testId, payload) {
  const { data } = await authHttp.patch(
    `/specialist-workspace/endo/cases/${caseId}/diagnostic-tests/${testId}`,
    payload,
  );
  return data.test;
}

export async function addEndoTreatmentStage(caseId, payload) {
  const { data } = await authHttp.post(
    `/specialist-workspace/endo/cases/${caseId}/treatment-stages`,
    payload,
  );
  return data.stage;
}

export async function updateEndoTreatmentStage(caseId, stageId, payload) {
  const { data } = await authHttp.patch(
    `/specialist-workspace/endo/cases/${caseId}/treatment-stages/${stageId}`,
    payload,
  );
  return data.stage;
}

export async function getEndoDifficultyAssessment(caseId) {
  const { data } = await authHttp.get(
    `/specialist-workspace/endo/cases/${caseId}/difficulty-assessment`,
  );
  return data.difficultyAssessment;
}

export async function saveEndoDifficultyAssessment(caseId, payload) {
  const { data } = await authHttp.put(
    `/specialist-workspace/endo/cases/${caseId}/difficulty-assessment`,
    payload,
  );
  return data.difficultyAssessment;
}

export async function listEndoRadiographEvidence(caseId) {
  const { data } = await authHttp.get(
    `/specialist-workspace/endo/cases/${caseId}/radiograph-evidence`,
  );
  return data.slots || [];
}

export async function upsertEndoRadiographEvidence(caseId, evidenceType, payload) {
  const { data } = await authHttp.put(
    `/specialist-workspace/endo/cases/${caseId}/radiograph-evidence/${evidenceType}`,
    payload,
  );
  return data.slot;
}

export async function unlinkEndoRadiographEvidence(caseId, evidenceType) {
  const { data } = await authHttp.delete(
    `/specialist-workspace/endo/cases/${caseId}/radiograph-evidence/${evidenceType}`,
  );
  return data.unlinked;
}
