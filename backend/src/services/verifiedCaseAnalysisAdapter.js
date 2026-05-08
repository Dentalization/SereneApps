import { File } from 'node:buffer';

function extractFindings(payload = {}) {
  if (payload.normalized_findings) return payload.normalized_findings;
  if (payload.visual_findings) return payload.visual_findings;
  if (Array.isArray(payload.findings)) return { findings: payload.findings };
  if (Array.isArray(payload.detections)) {
    return {
      findings: payload.detections.map((detection) => ({
        label: detection.label || 'AI finding',
        severity: detection.severity || payload.concern_level || 'mild',
        confidence: detection.confidence ?? null,
        tooth_or_region: detection.tooth_or_region || detection.location || null,
        notes: detection.description || '',
      })),
    };
  }
  return { findings: [] };
}

export function createDeepDentalCaseAnalysisAdapter({
  fetchImpl = fetch,
  baseUrl = process.env.DEEPDENTAL_API_BASE_URL || process.env.XCORE_PY_API_BASE_URL || 'http://127.0.0.1:8000',
  apiKey = process.env.DEEPDENTAL_API_KEY || process.env.SERENE_AI_API_KEY || '',
} = {}) {
  return {
    async analyzeImage({ imageBuffer, image, context = 'Verified Case Workspace server-side dental image analysis.' }) {
      if (!apiKey) {
        const error = new Error('deepdental_analysis_not_configured');
        error.code = 'deepdental_analysis_not_configured';
        throw error;
      }

      const formData = new FormData();
      const file = new File([imageBuffer], image.file_name || 'case-image.jpg', { type: image.mime_type || 'image/jpeg' });
      formData.append('image', file);
      formData.append('context', context);
      formData.append('role', 'dentist');
      formData.append('language', 'id');
      formData.append('include_annotated', 'true');

      const response = await fetchImpl(new URL('/api/v1/images/analyze', baseUrl.replace(/\/$/, '') + '/'), {
        method: 'POST',
        headers: { 'X-API-Key': apiKey },
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data?.error?.code || data?.detail || 'deepdental_analysis_failed');
        error.code = data?.error?.code || 'deepdental_analysis_failed';
        error.status = response.status;
        throw error;
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
