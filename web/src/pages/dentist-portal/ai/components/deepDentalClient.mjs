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

const DEFAULT_HISTORY_PAGE_SIZE = 100;
const MAX_HISTORY_PAGES = 100;

function firstArray(value, keys = []) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  for (const key of keys) {
    if (Array.isArray(value[key])) return value[key];
  }

  if (value.data && value.data !== value) {
    return firstArray(value.data, keys);
  }
  return [];
}

function paginationMetadata(payload = {}) {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') return {};
  return {
    ...(payload.data?.pagination || {}),
    ...(payload.data?.meta || {}),
    ...(payload.data && !Array.isArray(payload.data) && typeof payload.data === 'object' ? payload.data : {}),
    ...(payload.pagination || {}),
    ...(payload.meta || {}),
    ...payload,
  };
}

function recordKey(record) {
  return record?.id || record?.message_id || record?.session_id || record?.uuid || null;
}

function pageSignature(records = []) {
  return records.map((record, index) => (
    recordKey(record) || `${index}:${record?.created_at || record?.updated_at || ''}:${record?.role || ''}:${record?.content || ''}`
  )).join('|');
}

function nextPaginationQuery(payload, { page, perPage, records }) {
  const metadata = paginationMetadata(payload);
  const nextCursor = metadata.next_cursor ?? metadata.nextCursor;
  if (nextCursor !== null && nextCursor !== undefined && nextCursor !== '') {
    return { cursor: nextCursor, per_page: perPage };
  }

  const nextPage = Number(metadata.next_page ?? metadata.nextPage);
  if (Number.isFinite(nextPage) && nextPage > page) {
    return { page: nextPage, per_page: perPage };
  }

  const hasMore = metadata.has_more ?? metadata.hasMore;
  if (hasMore === false) return null;

  const currentPage = Number(metadata.page ?? metadata.current_page ?? metadata.currentPage ?? page);
  const totalPages = Number(metadata.total_pages ?? metadata.totalPages ?? metadata.last_page ?? metadata.lastPage);
  if (Number.isFinite(totalPages)) {
    return currentPage < totalPages ? { page: currentPage + 1, per_page: perPage } : null;
  }

  const total = Number(metadata.total ?? metadata.total_count ?? metadata.totalCount);
  const reportedPageSize = Number(metadata.per_page ?? metadata.perPage ?? metadata.page_size ?? metadata.pageSize ?? perPage);
  if (Number.isFinite(total) && Number.isFinite(reportedPageSize) && reportedPageSize > 0) {
    return currentPage * reportedPageSize < total
      ? { page: currentPage + 1, per_page: reportedPageSize }
      : null;
  }

  // If the response omits pagination metadata, probe the next page until the
  // server returns an empty or duplicate page. This also covers deployments
  // that silently cap per_page below the requested size.
  if (hasMore === true || records.length > 0) {
    return { page: page + 1, per_page: perPage };
  }
  return null;
}

async function loadAllPages({ request, path, collectionKeys, perPage = DEFAULT_HISTORY_PAGE_SIZE }) {
  const collected = [];
  const seenRecordKeys = new Set();
  const seenPageSignatures = new Set();
  let query = { page: 1, per_page: perPage };

  for (let requestCount = 0; query && requestCount < MAX_HISTORY_PAGES; requestCount += 1) {
    const search = new URLSearchParams(query).toString();
    let payload;
    try {
      payload = await request(`${path}?${search}`);
    } catch (error) {
      if (collected.length > 0 && error?.status === 404) break;
      throw error;
    }
    const records = firstArray(payload, collectionKeys);
    const signature = pageSignature(records);

    // Some older deployments ignore pagination parameters and return the same
    // unpaginated array for every page. Stop once that behavior is detected.
    if (seenPageSignatures.has(signature)) break;
    seenPageSignatures.add(signature);

    for (const record of records) {
      const key = recordKey(record);
      if (key && seenRecordKeys.has(key)) continue;
      if (key) seenRecordKeys.add(key);
      collected.push(record);
    }

    query = nextPaginationQuery(payload, {
      page: Number(query.page || requestCount + 1),
      perPage,
      records,
    });
  }

  return collected;
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
    fetchSessions: () => loadAllPages({
      request,
      path: '/sessions',
      collectionKeys: ['sessions', 'items', 'results'],
    }).then((sessions) => ({ sessions })),
    loadMessages: (sessionId) => loadAllPages({
      request,
      path: `/sessions/${sessionId}/messages`,
      collectionKeys: ['messages', 'items', 'results'],
    }),
    deleteSession: (sessionId) => request(`/sessions/${sessionId}`, { method: 'DELETE' }),
    detectImage: (formData, signal) => request('/images/detect', { method: 'POST', body: formData, signal, timeoutMs: 30000 }),
    analyzeImage: (formData, signal) => request('/images/analyze', { method: 'POST', body: formData, signal, timeoutMs: 45000 }),
    chat: (body, signal) => request('/chat', { method: 'POST', body, signal, timeoutMs: 30000 }),
    chatUpload: (formData, signal) => request('/chat/upload', { method: 'POST', body: formData, signal, timeoutMs: 30000 }),
    knowledgeQuery: (body, signal) => request('/knowledge/query', { method: 'POST', body, signal, timeoutMs: 45000 }),
  };
}
