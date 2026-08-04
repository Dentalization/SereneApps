import { getAccessToken } from '../../utils/auth/tokenStorage';

const BASE = '/api/v1/x-core/analysis-cases';

async function request(path = '', options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error || `Request failed (${response.status})`);
    error.code = payload.code;
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export const listAnalysisCases = () => request().then((payload) => payload.cases || []);
export const getAnalysisCase = (caseId) => request(`/${caseId}`).then((payload) => payload.case);
export const createAnalysisCase = (payload) => request('', { method: 'POST', body: JSON.stringify(payload) }).then((result) => result.case);
export const updateAnalysisCase = (caseId, payload) => request(`/${caseId}`, { method: 'PUT', body: JSON.stringify(payload) }).then((result) => result.case);
export const saveAnalysisRender = (caseId, itemId, renderDataUrl) => request(`/${caseId}/items/${itemId}/render`, {
  method: 'PUT', body: JSON.stringify({ render_data_url: renderDataUrl }),
}).then((result) => result.render);
export const generateAnalysisReport = (caseId, status = 'DRAFT') => request(`/${caseId}/reports`, {
  method: 'POST', body: JSON.stringify({ status }),
}).then((result) => result.report);

export async function openAnalysisReport(caseId, reportId) {
  const response = await fetch(`${BASE}/${caseId}/reports/${reportId}/pdf`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!response.ok) throw new Error('PDF laporan tidak dapat dibuka');
  const blobUrl = URL.createObjectURL(await response.blob());
  window.open(blobUrl, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

