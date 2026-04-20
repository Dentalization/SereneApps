import { PY_API_BASE } from '../../../../config/api';

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(value);
}

export function buildImagingUrl(path, params = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const rawUrl = `${PY_API_BASE}${normalizedPath}`;
  const url = new URL(rawUrl, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });

  return isAbsoluteUrl(rawUrl) ? url.toString() : `${url.pathname}${url.search}`;
}

export function buildStudyAssetParams(study, extraParams = {}) {
  const params = { ...extraParams };
  if (study?.shareToken) {
    params.share_token = study.shareToken;
  }
  return params;
}
