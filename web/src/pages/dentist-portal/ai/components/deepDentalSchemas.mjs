export const VISUAL_FINDINGS_SCHEMA_VERSION = '2026-05-07.deepdental.visual-findings.v1';
export const DEFAULT_ANNOTATED_IMAGE_MIME_TYPE = 'image/jpeg';

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function normalizeMimeType(value) {
  const mime = String(value || '').trim().toLowerCase();
  return ALLOWED_IMAGE_MIME_TYPES.has(mime) ? mime : '';
}

export function getAnnotatedImageMimeType(findings = {}) {
  return normalizeMimeType(
    findings.annotated_image_mime_type ||
    findings.annotated_image_mime ||
    findings.annotated_image_content_type ||
    findings.annotated_image?.mime_type ||
    findings.annotated_image?.content_type
  );
}

export function buildAnnotatedImageDataUrl(findingsOrBase64, fallbackMimeType = DEFAULT_ANNOTATED_IMAGE_MIME_TYPE) {
  const findings = typeof findingsOrBase64 === 'string'
    ? { annotated_image_base64: findingsOrBase64 }
    : findingsOrBase64 || {};
  const base64 = findings.annotated_image_base64 || findings.base64 || '';

  if (!base64) return '';
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(base64)) return base64;

  const mime = getAnnotatedImageMimeType(findings) || normalizeMimeType(fallbackMimeType) || DEFAULT_ANNOTATED_IMAGE_MIME_TYPE;
  return `data:${mime};base64,${base64}`;
}

export function normalizeVisualFindings(data) {
  if (!data || typeof data !== 'object') return null;

  const warnings = [];
  const findings = {
    schema_version: data.schema_version || data.schemaVersion || VISUAL_FINDINGS_SCHEMA_VERSION,
    ...data,
  };

  if (findings.image_quality && typeof findings.image_quality === 'object') {
    const iq = findings.image_quality;
    const factors = Array.isArray(iq.limiting_factors) ? iq.limiting_factors : [];
    if (factors.length > 0 && !findings.limitations) {
      findings.limitations = factors.join(', ');
    }
    findings.image_quality =
      iq.rating || iq.quality || iq.assessment || iq.value ||
      Object.values(iq).find((value) => typeof value === 'string') || 'analyzed';
    warnings.push('image_quality_object_normalized');
  }

  if (findings.concern_level && typeof findings.concern_level === 'object') {
    findings.concern_level =
      findings.concern_level.level || findings.concern_level.value || 'unknown';
    warnings.push('concern_level_object_normalized');
  }

  if (findings.annotated_image_base64 && !getAnnotatedImageMimeType(findings)) {
    findings.annotated_image_mime_type = DEFAULT_ANNOTATED_IMAGE_MIME_TYPE;
    warnings.push('annotated_image_mime_type_missing');
  }

  if (Array.isArray(findings.schema_warnings)) {
    findings.schema_warnings = [...new Set([...findings.schema_warnings, ...warnings])];
  } else {
    findings.schema_warnings = warnings;
  }

  return findings;
}
