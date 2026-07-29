import { authHttp } from '../../../../utils/httpClient.js';
import { resolveWorkspaceArtifactUrl } from './workspaceArtifactUrls.mjs';

export { resolveWorkspaceArtifactUrl } from './workspaceArtifactUrls.mjs';

export const VERIFIED_CASE_ENDPOINTS = Object.freeze({
  cases: '/cases',
  caseById: (caseId) => `/cases/${caseId}`,
  verifyCase: (caseId) => `/cases/${caseId}/verify`,
  archiveCase: (caseId) => `/cases/${caseId}/archive`,
  caseImages: (caseId) => `/cases/${caseId}/images`,
  caseImage: (caseId, imageId) => `/cases/${caseId}/images/${imageId}`,
  qualityCheck: (caseId, imageId) => `/cases/${caseId}/images/${imageId}/quality-check`,
  analyzeImage: (caseId, imageId) => `/cases/${caseId}/images/${imageId}/analyze`,
  findings: (caseId) => `/cases/${caseId}/findings`,
  finding: (caseId, findingId) => `/cases/${caseId}/findings/${findingId}`,
  confirmFinding: (caseId, findingId) => `/cases/${caseId}/findings/${findingId}/confirm`,
  rejectFinding: (caseId, findingId) => `/cases/${caseId}/findings/${findingId}/reject`,
  audit: (caseId) => `/cases/${caseId}/audit`,
  exportPdf: (caseId) => `/cases/${caseId}/export/pdf`,
  exportJson: (caseId) => `/cases/${caseId}/export/json`,
  linkPatient: (caseId) => `/cases/${caseId}/link-patient`,
  patientTimeline: (patientId) => `/patients/${patientId}/timeline`,
  sessionCase: (sessionId) => `/sessions/${sessionId}/case`,
});

function unwrapData(response) {
  return response?.data || response || {};
}

function normalizeImageArtifacts(payload, baseUrl) {
  const data = unwrapData(payload);
  const normalizeImage = (image) => ({
    ...image,
    signed_url_request: image?.signed_url_request || image?.signed_url || null,
    annotated_image_signed_url_request:
      image?.annotated_image_signed_url_request || image?.annotated_image_signed_url || null,
    signed_url: resolveWorkspaceArtifactUrl(image?.signed_url, baseUrl),
    annotated_image_signed_url: resolveWorkspaceArtifactUrl(image?.annotated_image_signed_url, baseUrl),
  });
  return {
    ...data,
    ...(Array.isArray(data.images) ? { images: data.images.map(normalizeImage) } : {}),
    ...(data.image ? { image: normalizeImage(data.image) } : {}),
  };
}

export function createVerifiedCaseWorkspaceClient({ http = authHttp } = {}) {
  const normalize = (response) => normalizeImageArtifacts(response, http?.defaults?.baseURL || '');
  return {
    listCases: (params = {}) => http.get(VERIFIED_CASE_ENDPOINTS.cases, { params }).then(unwrapData),
    createCase: (body = {}) => http.post(VERIFIED_CASE_ENDPOINTS.cases, body).then(unwrapData),
    getCase: (caseId) => http.get(VERIFIED_CASE_ENDPOINTS.caseById(caseId)).then(normalize),
    patchCase: (caseId, body = {}) => http.patch(VERIFIED_CASE_ENDPOINTS.caseById(caseId), body).then(unwrapData),
    verifyCase: (caseId) => http.post(VERIFIED_CASE_ENDPOINTS.verifyCase(caseId), {}).then(unwrapData),
    archiveCase: (caseId, body = {}) => http.post(VERIFIED_CASE_ENDPOINTS.archiveCase(caseId), body).then(unwrapData),
    getSessionCase: (sessionId) => http.get(VERIFIED_CASE_ENDPOINTS.sessionCase(sessionId)).then(unwrapData),
    createSessionCase: (sessionId, body = {}) => http.post(VERIFIED_CASE_ENDPOINTS.sessionCase(sessionId), body).then(unwrapData),
    uploadImages: (caseId, files = [], { onUploadProgress } = {}) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('images', file));
      return http.post(VERIFIED_CASE_ENDPOINTS.caseImages(caseId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      }).then(normalize);
    },
    fetchArtifactBlob: (artifactUrl) => http.get(
      resolveWorkspaceArtifactUrl(artifactUrl, http?.defaults?.baseURL || ''),
      { responseType: 'blob' }
    ).then((response) => response?.data),
    listImages: (caseId) => http.get(VERIFIED_CASE_ENDPOINTS.caseImages(caseId)).then(normalize),
    removeImage: (caseId, imageId, body = {}) => http.delete(VERIFIED_CASE_ENDPOINTS.caseImage(caseId, imageId), { data: body }).then(unwrapData),
    runQualityCheck: (caseId, imageId, metrics = {}) => http.post(VERIFIED_CASE_ENDPOINTS.qualityCheck(caseId, imageId), { metrics }).then(normalize),
    recordImageAnalysis: (caseId, imageId, body = {}) => http.post(VERIFIED_CASE_ENDPOINTS.analyzeImage(caseId, imageId), body).then(normalize),
    listFindings: (caseId) => http.get(VERIFIED_CASE_ENDPOINTS.findings(caseId)).then(unwrapData),
    addManualFinding: (caseId, body = {}) => http.post(VERIFIED_CASE_ENDPOINTS.findings(caseId), body).then(unwrapData),
    editFinding: (caseId, findingId, body = {}) => http.patch(VERIFIED_CASE_ENDPOINTS.finding(caseId, findingId), body).then(unwrapData),
    confirmFinding: (caseId, findingId, body = {}) => http.post(VERIFIED_CASE_ENDPOINTS.confirmFinding(caseId, findingId), body).then(unwrapData),
    rejectFinding: (caseId, findingId, body = {}) => http.post(VERIFIED_CASE_ENDPOINTS.rejectFinding(caseId, findingId), body).then(unwrapData),
    listAudit: (caseId) => http.get(VERIFIED_CASE_ENDPOINTS.audit(caseId)).then(unwrapData),
    exportPdf: (caseId, body = {}) => http.post(VERIFIED_CASE_ENDPOINTS.exportPdf(caseId), body).then(unwrapData),
    exportJson: (caseId, body = {}) => http.post(VERIFIED_CASE_ENDPOINTS.exportJson(caseId), body).then(unwrapData),
    linkPatient: (caseId, body = {}) => http.post(VERIFIED_CASE_ENDPOINTS.linkPatient(caseId), body).then(unwrapData),
    getPatientTimeline: (patientId) => http.get(VERIFIED_CASE_ENDPOINTS.patientTimeline(patientId)).then(unwrapData),
  };
}

export const verifiedCaseWorkspaceClient = createVerifiedCaseWorkspaceClient();
