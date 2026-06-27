export const DEFAULT_DEEPDENTAL_PROXY_BASE_URL = '/py-api/api/v1';

const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export class DeepDentalApiError extends Error {
  constructor(message, { status = 0, data = null, code = 'deepdental_request_failed' } = {}) {
    super(message);
    this.name = 'DeepDentalApiError';
    this.status = status;
    this.data = data;
    this.code = code;
  }
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/$/, '');
}

export function resolveDeepDentalConfig(env = {}) {
  const rawBase = env.VITE_DEEPDENTAL_PROXY_BASE_URL || DEFAULT_DEEPDENTAL_PROXY_BASE_URL;
  const baseUrl = trimTrailingSlash(rawBase);
  const usesProductionFallback = baseUrl.includes('api.dentalization.id');

  return {
    baseUrl,
    authMode: 'bearer-proxy',
    isConfigured: Boolean(baseUrl) && !usesProductionFallback,
    configurationError: usesProductionFallback
      ? 'DeepDental browser client must use a server-side proxy, not the production API directly.'
      : null,
  };
}

export function createDeepDentalHeaders({ accessToken = '', contentType = '' } = {}) {
  const headers = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (contentType === 'json') headers['Content-Type'] = 'application/json';
  return headers;
}

export function buildApiUrl(baseUrl, path) {
  const cleanBase = trimTrailingSlash(baseUrl || DEFAULT_DEEPDENTAL_PROXY_BASE_URL);
  const cleanPath = String(path || '').startsWith('/') ? path : `/${path || ''}`;
  return `${cleanBase}${cleanPath}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mergeAbortSignals(signal, controller) {
  if (!signal) return () => {};
  const abort = () => controller.abort(signal.reason);
  if (signal.aborted) abort();
  signal.addEventListener('abort', abort, { once: true });
  return () => signal.removeEventListener('abort', abort);
}

async function parseResponse(response) {
  const contentType = response.headers?.get?.('content-type') || '';
  if (!contentType.includes('application/json')) {
    return response.text ? response.text() : null;
  }
  return response.json().catch(() => null);
}

export async function requestDeepDental({
  fetchImpl = fetch,
  baseUrl = DEFAULT_DEEPDENTAL_PROXY_BASE_URL,
  accessToken = '',
  path = '/',
  method = 'GET',
  body = null,
  headers = {},
  signal,
  timeoutMs = 20000,
  retries = 1,
  retryDelayMs = 350,
} = {}) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const clearAbortListener = mergeAbortSignals(signal, controller);
    const timeoutId = setTimeout(() => controller.abort(new Error('request_timeout')), timeoutMs);

    try {
      const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
      const requestHeaders = {
        ...createDeepDentalHeaders({ accessToken, contentType: body && !isFormData ? 'json' : '' }),
        ...headers,
      };
      const response = await fetchImpl(buildApiUrl(baseUrl, path), {
        method,
        headers: requestHeaders,
        body: body && !isFormData ? JSON.stringify(body) : body,
        signal: controller.signal,
      });
      const data = await parseResponse(response);

      if (!response.ok) {
        const code = data?.error?.code || data?.code || `http_${response.status}`;
        const message = data?.error?.message || data?.message || `DeepDental request failed with ${response.status}`;
        const error = new DeepDentalApiError(message, { status: response.status, data, code });
        if (attempt < retries && RETRY_STATUSES.has(response.status)) {
          lastError = error;
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }
        throw error;
      }

      return data;
    } catch (error) {
      lastError = error;
      if (attempt >= retries || error?.name === 'AbortError' || signal?.aborted) {
        throw error;
      }
      await sleep(retryDelayMs * (attempt + 1));
    } finally {
      clearTimeout(timeoutId);
      clearAbortListener();
    }
  }

  throw lastError || new DeepDentalApiError('DeepDental request failed');
}

export function createDeepDentalClient({
  config = resolveDeepDentalConfig(),
  getAccessToken = () => '',
  fetchImpl = fetch,
  timeoutMs = 20000,
  retries = 1,
} = {}) {
  const request = (path, options = {}) => requestDeepDental({
    fetchImpl,
    baseUrl: config.baseUrl,
    accessToken: getAccessToken(),
    timeoutMs,
    retries,
    path,
    ...options,
  });

  return {
    config,
    request,
    health: () => request('/health', { retries: 0, timeoutMs: 8000 }),
    createSession: (body) => request('/sessions', { method: 'POST', body }),
    fetchSessions: () => request('/sessions?page=1&per_page=100'),
    loadMessages: (sessionId) => request(`/sessions/${sessionId}/messages`),
    deleteSession: (sessionId) => request(`/sessions/${sessionId}`, { method: 'DELETE' }),
    detectImage: (formData, signal) => request('/images/detect', { method: 'POST', body: formData, signal, timeoutMs: 30000 }),
    analyzeImage: (formData, signal) => request('/images/analyze', { method: 'POST', body: formData, signal, timeoutMs: 45000 }),
    chat: (body, signal) => request('/chat', { method: 'POST', body, signal, timeoutMs: 30000 }),
    chatUpload: (formData, signal) => request('/chat/upload', { method: 'POST', body: formData, signal, timeoutMs: 30000 }),
    knowledgeQuery: (body, signal) => request('/knowledge/query', { method: 'POST', body, signal, timeoutMs: 45000 }),
  };
}
