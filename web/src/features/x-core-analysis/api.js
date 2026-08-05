import { getAccessToken } from '../../utils/auth/tokenStorage';

const BASE = '/api/v1/x-core/analysis-cases';

async function request(path = '', options = {}) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch (cause) {
    const error = new Error('Jaringan tidak tersedia. Periksa koneksi lalu coba lagi.');
    error.code = 'network_error';
    error.cause = cause;
    throw error;
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const fallback = response.status === 401
      ? 'Sesi berakhir. Silakan masuk kembali.'
      : response.status === 403
        ? 'Anda tidak memiliki akses ke kasus ini.'
        : `Permintaan gagal (${response.status}).`;
    const error = new Error(payload.error || fallback);
    error.code = payload.code;
    error.status = response.status;
    error.details = payload.details;
    throw error;
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export const listAnalysisCases = () => request().then((payload) => payload.cases || []);
export const getAnalysisCase = (caseId) => request(`/${caseId}`).then((payload) => payload.case);
export const createAnalysisCase = (payload) => request('', { method: 'POST', body: JSON.stringify(payload) }).then((result) => result.case);
export const updateAnalysisCase = (caseId, payload) => request(`/${caseId}`, { method: 'PUT', body: JSON.stringify(payload) }).then((result) => result.case);
export const deleteAnalysisCase = (caseId) => request(`/${caseId}`, { method: 'DELETE' });
export const saveAnalysisRender = (caseId, itemId, renders) => request(`/${caseId}/items/${itemId}/render`, {
  method: 'PUT', body: JSON.stringify({ renders }),
}).then((result) => result.render);
export const preflightAnalysisReport = (caseId) => request(`/${caseId}/reports/preflight`).then((result) => result.preflight);
export async function listAnalysisItemAnnotations(item) {
  const params = new URLSearchParams({
    series_uid: item.series_uid,
    viewer_type: item.viewer_type,
  });
  const response = await fetch(`/api/v1/x-core/studies/${item.study_id}/annotations?${params}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error || 'Anotasi radiografi tidak dapat dimuat.');
    error.code = payload.code;
    error.status = response.status;
    throw error;
  }
  const payload = await response.json();
  return payload.annotations || [];
}
export const generateAnalysisReport = (caseId, status = 'DRAFT') => request(`/${caseId}/reports`, {
  method: 'POST', body: JSON.stringify({ status }),
}).then((result) => result.report);

export async function openAnalysisReport(caseId, reportId) {
  let response;
  try {
    response = await fetch(`${BASE}/${caseId}/reports/${reportId}/pdf`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    });
  } catch (cause) {
    const error = new Error('Jaringan tidak tersedia. PDF laporan tidak dapat dibuka.');
    error.code = 'network_error';
    error.cause = cause;
    throw error;
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = response.status === 401
      ? 'Sesi berakhir. Silakan masuk kembali.'
      : response.status === 403
        ? 'Anda tidak memiliki akses ke PDF ini.'
        : payload.error || 'PDF laporan tidak dapat dibuka.';
    const error = new Error(message);
    error.code = payload.code;
    error.status = response.status;
    throw error;
  }
  const blobUrl = URL.createObjectURL(await response.blob());
  window.open(blobUrl, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
