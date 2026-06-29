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

export function resolveDeepDentalTlsPolicy(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';
  const explicitInsecureMode = env.DEEPDENTAL_ALLOW_INSECURE_TLS === 'true';
  const globalTlsDisabled = env.NODE_TLS_REJECT_UNAUTHORIZED === '0';
  const legacyDevelopmentMode =
    !isProduction &&
    globalTlsDisabled;
  const insecureDevelopmentMode = explicitInsecureMode || legacyDevelopmentMode;

  if (isProduction && (explicitInsecureMode || globalTlsDisabled)) {
    throw new Error('deepdental_insecure_tls_forbidden');
  }

  const ca = String(env.DEEPDENTAL_CA_CERT || '')
    .replace(/\\n/g, '\n')
    .trim() || null;

  return {
    rejectUnauthorized: !insecureDevelopmentMode,
    ca,
    insecureDevelopmentMode,
  };
}

export function resolveProxyTimeoutMs(value, fallbackMs = 75_000) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0
    ? Math.max(10_000, numeric)
    : fallbackMs;
}
