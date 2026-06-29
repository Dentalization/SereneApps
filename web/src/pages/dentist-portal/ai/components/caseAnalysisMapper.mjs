import { normalizeVisualFindings } from './deepDentalSchemas.mjs';

function firstPresent(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== '');
}

export function resolveWorkspaceAssetUrl(value, authBaseUrl = '') {
  const assetUrl = String(value || '').trim();
  if (!assetUrl) return '';
  if (/^(?:https?:|data:image\/|blob:)/i.test(assetUrl)) return assetUrl;
  if (/^[a-z][a-z0-9+.-]*:/i.test(assetUrl)) return '';
  if (!authBaseUrl) return assetUrl;

  try {
    const base = new URL(authBaseUrl);
    if (assetUrl.startsWith('/')) return new URL(assetUrl, base.origin).toString();
    const baseWithSlash = `${authBaseUrl.replace(/\/+$/, '')}/`;
    return new URL(assetUrl, baseWithSlash).toString();
  } catch {
    return assetUrl;
  }
}

export function rehydrateAnnotatedImageArtifacts({
  messages = [],
  images = [],
  authBaseUrl = '',
} = {}) {
  const annotatedImages = images
    .filter((image) => image?.archived !== true && image?.annotated_image_signed_url)
    .sort((left, right) => (
      new Date(left.created_at || 0).getTime() - new Date(right.created_at || 0).getTime()
    ));
  if (annotatedImages.length === 0) return messages;

  let imageIndex = 0;
  return messages.map((message) => {
    const findings = message?.visualFindings;
    const isImageAnalysis =
      message?.type === 'ai' &&
      findings &&
      (
        findings.annotated_image_signed_url ||
        findings.annotated_image_base64 ||
        findings.detections?.length > 0 ||
        findings.findings?.length > 0
      );
    if (!isImageAnalysis || imageIndex >= annotatedImages.length) return message;

    const image = annotatedImages[imageIndex];
    imageIndex += 1;
    return {
      ...message,
      visualFindings: normalizeVisualFindings({
        ...findings,
        annotated_image_signed_url: resolveWorkspaceAssetUrl(
          image.annotated_image_signed_url,
          authBaseUrl
        ),
        annotated_image_mime_type:
          image.annotated_image_mime_type ||
          findings.annotated_image_mime_type ||
          null,
      }),
    };
  });
}

export function buildVisualFindingsFromCaseAnalysis({
  analysis = {},
  qualityCheck = null,
  authBaseUrl = '',
} = {}) {
  const nestedAnalysis = analysis.analysis || {};
  const aiFindings = analysis.findings || nestedAnalysis.findings || [];
  const firstRawResult = aiFindings[0]?.raw_ai_result || {};
  const rawAiResult =
    analysis.visual_findings ||
    nestedAnalysis.visual_findings ||
    firstRawResult;
  const aiDetections = Array.isArray(rawAiResult.detections) ? rawAiResult.detections : [];
  const rawFindings = Array.isArray(rawAiResult.findings) ? rawAiResult.findings : [];
  const displayFindings = rawFindings.length > 0
    ? rawFindings.map((finding) => ({
        ...finding,
        location: finding.location || finding.tooth_or_region,
        tooth_or_region: finding.tooth_or_region || finding.location,
        description: finding.description || finding.finding || finding.notes || finding.label,
        differentials: Array.isArray(finding.differentials) ? finding.differentials : [],
      }))
    : aiFindings.map((finding) => ({
        location: finding.location || finding.tooth_or_region,
        tooth_or_region: finding.tooth_or_region || finding.location,
        severity: finding.severity,
        confidence: finding.confidence,
        description: finding.description || finding.notes || finding.label,
        label: finding.label,
        differentials: Array.isArray(finding.differentials) ? finding.differentials : [],
      }));
  const image = analysis.image || nestedAnalysis.image || {};
  const annotatedImageBase64 = firstPresent(
    rawAiResult.annotated_image_base64,
    analysis.annotated_image_base64,
    nestedAnalysis.annotated_image_base64,
    image.annotated_image_base64
  );
  const annotatedImageMimeType = firstPresent(
    image.annotated_image_mime_type,
    rawAiResult.annotated_image_mime_type,
    analysis.annotated_image_mime_type,
    nestedAnalysis.annotated_image_mime_type
  );
  const annotatedImageSignedUrl = firstPresent(
    image.annotated_image_signed_url,
    rawAiResult.annotated_image_signed_url,
    analysis.annotated_image_signed_url,
    nestedAnalysis.annotated_image_signed_url
  );

  return normalizeVisualFindings({
    image_quality: rawAiResult.image_quality || qualityCheck?.quality_status || 'quality_checked',
    concern_level: rawAiResult.concern_level || (
      aiFindings.some((finding) => ['critical', 'severe'].includes(finding.severity))
        ? 'high'
        : 'moderate'
    ),
    findings: displayFindings,
    detections: aiDetections.map((detection) => ({
      mark_id: detection.mark_id,
      label: detection.label,
      confidence: detection.confidence,
      bbox: detection.bbox,
    })),
    recommendations: rawAiResult.recommendations?.length
      ? rawAiResult.recommendations
      : qualityCheck?.recommendation ? [qualityCheck.recommendation] : [],
    limitations: rawAiResult.limitations || 'AI-assisted case findings are preliminary until clinician confirmation.',
    suggested_questions: rawAiResult.suggested_questions || [],
    annotated_image_base64: annotatedImageBase64 || null,
    annotated_image_mime_type: annotatedImageMimeType || null,
    annotated_image_signed_url: resolveWorkspaceAssetUrl(annotatedImageSignedUrl, authBaseUrl) || null,
  });
}
