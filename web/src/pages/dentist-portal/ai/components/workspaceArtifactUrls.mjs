export function resolveWorkspaceArtifactUrl(value, baseUrl = '') {
  if (!value || typeof value !== 'string') return value || null;

  try {
    const browserOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const configured = baseUrl || browserOrigin;
    const apiBase = new URL(configured, browserOrigin);
    const candidate = new URL(value, apiBase.origin);

    // Repair legacy same-origin URLs generated with a stale public prefix
    // (for example /api/v1/case-storage while the API is mounted at /v1).
    // External absolute artifact origins are preserved unchanged.
    const marker = '/case-storage/';
    const markerIndex = candidate.pathname.indexOf(marker);
    if (candidate.origin === apiBase.origin && markerIndex >= 0) {
      const token = candidate.pathname.slice(markerIndex + marker.length);
      const apiPath = apiBase.pathname.replace(/\/+$/, '');
      const canonicalPath = `${apiPath}/case-storage/${token}`.replace(/\/{2,}/g, '/');
      return new URL(`${canonicalPath}${candidate.search}${candidate.hash}`, apiBase.origin).toString();
    }

    if (/^(?:https?:|blob:|data:)/i.test(value)) return value;
    return candidate.toString();
  } catch {
    return value;
  }
}
