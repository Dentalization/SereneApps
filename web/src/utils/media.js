const ABSOLUTE_URL_PATTERN = /^(?:[a-z][a-z0-9+\-.]*:)?\/\//i;
const DATA_URL_PATTERN = /^data:/i;

const envAuthBase = import.meta.env?.VITE_AUTH_API_BASE_URL;
const defaultBaseUrl = (envAuthBase && envAuthBase.trim()) ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');

function normaliseBase(base) {
  return (base || '').replace(/\/$/, '');
}

function normalisePath(path) {
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  // Encode each segment to handle spaces or special characters safely
  return withLeadingSlash
    .split('/')
    .map((segment, index) => {
      if (index === 0 || segment === '') {
        return segment;
      }
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join('/');
}

export function resolveMediaUrl(path, options = {}) {
  if (!path) return null;
  if (DATA_URL_PATTERN.test(path) || ABSOLUTE_URL_PATTERN.test(path)) {
    return path;
  }

  const baseUrl = normaliseBase(options.baseUrl || defaultBaseUrl || '');
  const normalisedPath = normalisePath(path);

  return `${baseUrl}${normalisedPath}`;
}

export default resolveMediaUrl;
