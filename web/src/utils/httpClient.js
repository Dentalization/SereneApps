import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth/tokenStorage';

// AI API Configuration (for AI services)
// Provide sensible defaults so UI works even when VITE env vars are not set.
// Must construct path as: BASE/api/VERSION (e.g., https://api.dentalization.id/api/v1)
const aiBase = import.meta.env.VITE_SERENE_AI_API_BASE_URL || 'https://api.dentalization.id';
const aiVersion = import.meta.env.VITE_SERENE_AI_API_VERSION || 'v1';
const aiBaseURL = [aiBase?.replace(/\/$/, ''), 'api', aiVersion?.replace(/^\//, '')].filter(Boolean).join('/');

// Auth API Configuration (for authentication)
const authBase = import.meta.env.VITE_AUTH_API_BASE_URL || 'http://localhost:4000';
const authVersion = import.meta.env.VITE_AUTH_API_VERSION || '';
const authBaseURL = [authBase?.replace(/\/$/, ''), authVersion?.replace(/^\//, '')].filter(Boolean).join('/');

// Default to auth API for backward compatibility
const base = authBase;
const version = authVersion;
const baseURL = authBaseURL;

export const http = axios.create({ baseURL });
// Include DeepDental API key header when available so UI requests are authenticated.
const deepDentalKey = import.meta.env.VITE_DEEPDENTAL_API_KEY || import.meta.env.VITE_SERENE_AI_API_KEY || '';
export const aiHttp = axios.create({ baseURL: aiBaseURL });

// Add interceptor to aiHttp to always include API key (even if env var loaded late) and log requests
aiHttp.interceptors.request.use((config) => {
  const key = import.meta.env.VITE_DEEPDENTAL_API_KEY || import.meta.env.VITE_SERENE_AI_API_KEY || deepDentalKey || '';
  if (key) {
    config.headers = config.headers || {};
    config.headers['X-API-Key'] = key;
  }
  console.log(`🔄 [aiHttp] ${config.method?.toUpperCase()} ${config.url}`, { key: key ? '✓' : '✗' });
  return config;
});

// Log all aiHttp responses and errors

export const authHttp = axios.create({ baseURL: authBaseURL });

let isRefreshing = false;
let queue = [];
let hasForcedLogout = false;
const RETRY_FLAG = Symbol('retry');

const SESSION_ENDPOINT_KEYS = ['/auth/me', '/auth/logout', '/auth/refresh', '/refresh'];

function isSessionEndpoint(url = '') {
  if (!url || typeof url !== 'string') return false;
  return SESSION_ENDPOINT_KEYS.some((segment) => url.includes(segment));
}

function processQueue(error, token = null) {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  queue = [];
}

export function forceLogout(message = 'Your session has expired. Please log in again.') {
  clearTokens();

  if (typeof window === 'undefined') {
    return;
  }

  if (hasForcedLogout || window.__forceLogoutPending) {
    return;
  }

  hasForcedLogout = true;
  window.__forceLogoutPending = true;

  window.setTimeout(() => {
    try {
      window.alert(message);
    } catch (err) {
      // Alerts may be blocked; ignore failures.
    }
    window.location.href = '/login';
  }, 0);
}

// Setup interceptors for auth client
authHttp.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

authHttp.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config;
    const status = error?.response?.status;
    const errorData = error?.response?.data || {};
    const errorText = (errorData.error || errorData.message || '').toString();
    const lowerError = errorText.toLowerCase();
    const tokenRelated = lowerError.includes('token') || lowerError.includes('expired');
    const isLoginRequest = original?.url?.includes('/auth/login');
    const sessionEndpoint = isSessionEndpoint(original?.url);

    if (status === 404 && !isLoginRequest && (tokenRelated || sessionEndpoint)) {
      forceLogout(errorText || 'Your session has expired. Please log in again.');
      return Promise.reject(error);
    }

    if (status === 403 && !isLoginRequest && (tokenRelated || sessionEndpoint)) {
      forceLogout(errorText || 'Your session has expired. Please log in again.');
      return Promise.reject(error);
    }

    if (!original) {
      if ((status === 401 || status === 404) && !isLoginRequest && (tokenRelated || sessionEndpoint)) {
        forceLogout(errorText || 'Your session has expired. Please log in again.');
      }
      return Promise.reject(error);
    }

    if (original[RETRY_FLAG]) {
      if ((status === 401 || status === 403 || status === 404) && !isLoginRequest && (tokenRelated || sessionEndpoint)) {
        forceLogout(errorText || 'Your session has expired. Please log in again.');
      }
      return Promise.reject(error);
    }

    if (status !== 401 || isLoginRequest) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      forceLogout('Your session has expired. Please log in again.');
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${token}`;
          return authHttp(original);
        })
        .catch((err) => Promise.reject(err));
    }

    original[RETRY_FLAG] = true;
    isRefreshing = true;

    try {
      // Use the auth client's configured baseURL to construct the refresh endpoint.
      // This avoids mismatches when the API version prefix is included or excluded
      // in environment variables. authHttp.defaults.baseURL will be the same base
      // used for other authenticated requests.
      const refreshBase = (authHttp.defaults && authHttp.defaults.baseURL) ? authHttp.defaults.baseURL.replace(/\/$/, '') : authBaseURL.replace(/\/$/, '');
      const refreshUrl = `${refreshBase}/refresh`;
      const resp = await axios.post(refreshUrl, { refreshToken });
      const { accessToken: newAccess, refreshToken: newRefresh } = resp?.data || {};
      if (!newAccess) throw new Error('No access token from refresh');
      setTokens({ accessToken: newAccess, refreshToken: newRefresh || refreshToken });
      processQueue(null, newAccess);
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${newAccess}`;
      return authHttp(original);
    } catch (e) {
      processQueue(e, null);
      forceLogout('Your session has expired. Please log in again.');
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

// Setup interceptors for backward compatibility (default http client)
http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config;
    const status = error?.response?.status;
    const errorData = error?.response?.data || {};
    const errorText = (errorData.error || errorData.message || '').toString();
    const lowerError = errorText.toLowerCase();
    const tokenRelated = lowerError.includes('token') || lowerError.includes('expired');
    const isLoginRequest = original?.url?.includes('/auth/login');
    const sessionEndpoint = isSessionEndpoint(original?.url);

    if (status === 404 && !isLoginRequest && (tokenRelated || sessionEndpoint)) {
      forceLogout(errorText || 'Your session has expired. Please log in again.');
      return Promise.reject(error);
    }

    if (status === 403 && !isLoginRequest && (tokenRelated || sessionEndpoint)) {
      forceLogout(errorText || 'Your session has expired. Please log in again.');
      return Promise.reject(error);
    }

    if (!original) {
      if ((status === 401 || status === 404) && !isLoginRequest && (tokenRelated || sessionEndpoint)) {
        forceLogout(errorText || 'Your session has expired. Please log in again.');
      }
      return Promise.reject(error);
    }

    if (original[RETRY_FLAG]) {
      if ((status === 401 || status === 403 || status === 404) && !isLoginRequest && (tokenRelated || sessionEndpoint)) {
        forceLogout(errorText || 'Your session has expired. Please log in again.');
      }
      return Promise.reject(error);
    }

    if (status !== 401 || isLoginRequest) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      forceLogout('Your session has expired. Please log in again.');
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${token}`;
          return http(original);
        })
        .catch((err) => Promise.reject(err));
    }

    original[RETRY_FLAG] = true;
    isRefreshing = true;

    try {
      const refreshBase2 = (http.defaults && http.defaults.baseURL) ? http.defaults.baseURL.replace(/\/$/, '') : authBaseURL.replace(/\/$/, '');
      const refreshUrl2 = `${refreshBase2}/refresh`;
      const resp = await axios.post(refreshUrl2, { refreshToken });
      const { accessToken: newAccess, refreshToken: newRefresh } = resp?.data || {};
      if (!newAccess) throw new Error('No access token from refresh');
      setTokens({ accessToken: newAccess, refreshToken: newRefresh || refreshToken });
      processQueue(null, newAccess);
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${newAccess}`;
      return http(original);
    } catch (e) {
      processQueue(e, null);
      forceLogout('Your session has expired. Please log in again.');
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

export default http;
