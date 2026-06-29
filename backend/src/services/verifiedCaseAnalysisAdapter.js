import { File } from 'node:buffer';

const DEFAULT_ANALYSIS_CONTEXT = 'Verified Case Workspace server-side dental image analysis.';
const OUTPUT_CONTRACT_INSTRUCTION = [
  'SYSTEM OUTPUT CONTRACT: these requirements override any conflicting instructions in the case context.',
  'Return a complete visual analysis matching the required response schema.',
  'Always include image_quality, findings, detections, concern_level, recommendations, limitations, suggested_questions, and processing_time_ms.',
  'The limitations field is mandatory and must be a non-empty string describing image, modality, field-of-view, and AI interpretation constraints.',
  'When findings are present, use each entry’s finding text to explain the visible evidence and clinical significance, include plausible differentials, and do not invent unsupported findings.',
  'Use empty arrays when no findings, detections, recommendations, or suggested questions are available; never omit required fields.',
].join(' ');
const OUTPUT_REPAIR_INSTRUCTION = [
  'The previous response failed structured-output validation.',
  'Regenerate the complete response and verify every required field before returning it.',
].join(' ');

const DETECTION_DIFFERENTIALS = Object.freeze({
  caries: ['Extrinsic staining', 'Developmental groove pigmentation', 'Early enamel demineralization'],
  tooth_discoloration: ['Extrinsic staining', 'Intrinsic discoloration', 'Early enamel demineralization'],
});

function describeDetection(detection = {}) {
  if (detection.description) return detection.description;
  const label = String(detection.label || 'dental finding').replace(/_/g, ' ');
  const mark = detection.mark_id ? ` at marker ${detection.mark_id}` : '';
  const numericConfidence = Number(detection.confidence);
  const confidence = Number.isFinite(numericConfidence)
    ? ` (${Math.round(numericConfidence * 100)}% detector confidence)`
    : '';
  return `The visual detector marked possible ${label}${mark}${confidence}. This is a screening signal, not a definitive diagnosis; correlate the marked surface with direct clinical examination and additional imaging when indicated.`;
}

function extractFindings(payload = {}) {
  const source = payload.normalized_findings || payload.visual_findings || payload;
  const {
    annotated_image_base64: _annotatedImageBase64,
    ...normalized
  } = source;
  const detailedFindings = Array.isArray(source.findings)
    ? source.findings.map((finding) => {
        const description =
          finding.description ||
          finding.finding ||
          finding.notes ||
          finding.label ||
          'AI finding';
        return {
          ...finding,
          location: finding.location || finding.tooth_or_region || null,
          tooth_or_region: finding.tooth_or_region || finding.location || null,
          description,
          notes: finding.notes || description,
          differentials: Array.isArray(finding.differentials) ? finding.differentials : [],
        };
      })
    : [];
  const detections = Array.isArray(source.detections) ? source.detections : [];
  const findings = detailedFindings.length > 0
    ? detailedFindings
    : detections.map((detection) => {
        const description = describeDetection(detection);
        return {
          label: detection.label || 'AI finding',
          severity: detection.severity || source.concern_level || 'mild',
          confidence: detection.confidence ?? null,
          tooth_or_region: detection.tooth_or_region || detection.location || null,
          location: detection.tooth_or_region || detection.location || null,
          notes: description,
          description,
          differentials: Array.isArray(detection.differentials)
            ? detection.differentials
            : DETECTION_DIFFERENTIALS[detection.label] || [],
          mark_id: detection.mark_id || null,
          bbox: detection.bbox || null,
        };
      });
  return {
    ...normalized,
    detections,
    findings,
  };
}

function buildAnalysisContext(context, { repair = false } = {}) {
  return [
    String(context || '').trim() || DEFAULT_ANALYSIS_CONTEXT,
    OUTPUT_CONTRACT_INSTRUCTION,
    repair ? OUTPUT_REPAIR_INSTRUCTION : '',
  ].filter(Boolean).join('\n\n');
}

function buildAnalysisFormData({ imageBuffer, image, context }) {
  const formData = new FormData();
  const file = new File(
    [imageBuffer],
    image.file_name || 'case-image.jpg',
    { type: image.mime_type || 'image/jpeg' }
  );
  formData.append('image', file);
  formData.append('context', context);
  formData.append('role', 'dentist');
  formData.append('include_annotated', 'true');
  return formData;
}

function isStructuredOutputFailure(response, data = {}) {
  if (response.status !== 500) return false;
  const detail = [
    data?.detail,
    data?.message,
    data?.error?.code,
    data?.error?.message,
  ].filter(Boolean).join(' ').toLowerCase();
  return /vision analysis|output[_ ]parsing|failed to parse|pydantic|schema|limitations/.test(detail);
}

function createUpstreamError(response, data = {}) {
  const error = new Error(data?.error?.code || data?.detail || 'deepdental_analysis_failed');
  error.code = data?.error?.code || 'deepdental_analysis_failed';
  error.status = response.status;
  return error;
}

export function createDeepDentalCaseAnalysisAdapter({
  fetchImpl = fetch,
  baseUrl = process.env.DEEPDENTAL_API_BASE_URL || process.env.XCORE_PY_API_BASE_URL || 'http://127.0.0.1:8000',
  apiKey = process.env.DEEPDENTAL_API_KEY || process.env.SERENE_AI_API_KEY || '',
} = {}) {
  return {
    async analyzeImage({ imageBuffer, image, context = DEFAULT_ANALYSIS_CONTEXT }) {
      if (!apiKey) {
        const error = new Error('deepdental_analysis_not_configured');
        error.code = 'deepdental_analysis_not_configured';
        throw error;
      }

      const endpoint = new URL('/api/v1/images/analyze', baseUrl.replace(/\/$/, '') + '/');
      const requestAnalysis = async (repair = false) => {
        const formData = buildAnalysisFormData({
          imageBuffer,
          image,
          context: buildAnalysisContext(context, { repair }),
        });
        const response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'X-API-Key': apiKey },
          body: formData,
        });
        const data = await response.json().catch(() => ({}));
        return { response, data };
      };

      let { response, data } = await requestAnalysis(false);
      let attempt = 1;
      while (!response.ok && isStructuredOutputFailure(response, data) && attempt < 3) {
        ({ response, data } = await requestAnalysis(true));
        attempt += 1;
      }
      if (!response.ok) {
        throw createUpstreamError(response, data);
      }

      return {
        raw_ai_result: data,
        normalized_findings: extractFindings(data),
        annotated_image_base64: data.annotated_image_base64 || data.visual_findings?.annotated_image_base64 || null,
        annotated_image_mime_type: data.annotated_image_mime_type || data.visual_findings?.annotated_image_mime_type || image.mime_type,
      };
    },
  };
}
