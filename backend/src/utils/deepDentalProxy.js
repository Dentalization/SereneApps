const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const DEEPDENTAL_ROLES = new Set([
  'admin',
  'super_admin',
  'ai_engineer',
  'compliance_officer',
  'dentist',
  'patient',
  'clinic_owner',
  'owner',
  'clinic_admin',
  'clinic_staff',
  'manager',
  'front_office',
  'nurse',
  'staff',
]);

export function isDeepDentalApiPath(pathname = '') {
  return /^\/api\/v\d+\//.test(pathname);
}

export function buildDeepDentalProxyHeaders({ incomingHeaders = {}, backendApiKey = '' } = {}) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(incomingHeaders)) {
    const normalized = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalized) || normalized === 'x-api-key') continue;
    if (value == null) continue;

    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item));
    } else {
      headers.set(key, value);
    }
  }

  if (backendApiKey) {
    headers.set('X-API-Key', backendApiKey);
  }

  return headers;
}

export function getDeepDentalProxyAuthError({
  path = '',
  authorization = '',
  backendApiKey = '',
  verifyToken,
} = {}) {
  if (!isDeepDentalApiPath(path)) return null;

  if (!backendApiKey) {
    return { status: 503, code: 'deepdental_proxy_not_configured' };
  }

  const token = authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { status: 401, code: 'deepdental_proxy_auth_required' };
  }

  try {
    const payload = verifyToken?.(token);
    const roles = payload?.roles || [];
    const hasRole = roles.some((role) => DEEPDENTAL_ROLES.has(role));
    if (!hasRole) {
      return { status: 403, code: 'deepdental_proxy_forbidden' };
    }
  } catch {
    return { status: 401, code: 'deepdental_proxy_auth_invalid' };
  }

  return null;
}
