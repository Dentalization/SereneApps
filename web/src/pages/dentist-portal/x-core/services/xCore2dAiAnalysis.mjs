import { normalizeVisualFindings } from '../../ai/components/deepDentalSchemas.mjs';

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const RETRYABLE_ANALYSIS_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_ANALYSIS_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 400;
const OUTPUT_CONTRACT_INSTRUCTION = [
  'SYSTEM OUTPUT CONTRACT: return a complete visual analysis matching the required response schema.',
  'Always include image_quality, findings, detections, concern_level, recommendations, limitations, suggested_questions, and processing_time_ms.',
  'The limitations field is mandatory and must be a non-empty string describing modality, field-of-view, image-quality, and AI interpretation constraints.',
  'Use empty arrays when no findings, detections, recommendations, or suggested questions are available; never omit required fields.',
  'When findings are present, include mark_id, location, description, severity, confidence, and differentials.',
].join(' ');
const OUTPUT_REPAIR_INSTRUCTION = [
  'The previous response failed structured-output validation.',
  'Regenerate the complete response and verify every required field before returning it.',
].join(' ');

export class XCore2DAnalysisError extends Error {
  constructor(message, { code = 'xcore_2d_analysis_failed', status = 0 } = {}) {
    super(message);
    this.name = 'XCore2DAnalysisError';
    this.code = code;
    this.status = status;
  }
}

function extensionForMimeType(mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

export function buildXCore2DAnalysisContext({
  modality = '2D dental image',
  seriesTitle = 'Dental radiograph',
} = {}) {
  return [
    `Analisis citra dental 2D ${modality} (${seriesTitle}) untuk dokter gigi.`,
    'Jawab seluruh reasoning klinis dalam Bahasa Indonesia.',
    'Identifikasi lokasi temuan, deskripsi, tingkat keparahan, confidence, dan diagnosis banding.',
    'Berikan concern level, rekomendasi pemeriksaan lanjutan, serta limitations yang eksplisit.',
    'Hasil merupakan AI-assisted preliminary finding dan wajib dikonfirmasi secara klinis.',
    OUTPUT_CONTRACT_INSTRUCTION,
  ].join(' ');
}

function getErrorText(error) {
  return [
    error?.code,
    error?.message,
    error?.data?.detail,
    error?.data?.message,
    error?.data?.error?.code,
    error?.data?.error?.message,
    typeof error?.data?.error === 'string' ? error.data.error : '',
  ].filter(Boolean).join(' ').toLowerCase();
}

function isRetryableAnalysisError(error, signal) {
  if (signal?.aborted) return false;
  if (error?.name === 'AbortError' || error?.code === 'request_timeout') return true;
  if (RETRYABLE_ANALYSIS_STATUSES.has(Number(error?.status || 0))) return true;
  return /output[_ ]parsing|failed to parse|pydantic|schema|limitations field|required field/.test(getErrorText(error));
}

function ensureOutputContract(context = '') {
  const baseContext = String(context || '').trim();
  if (baseContext.includes('SYSTEM OUTPUT CONTRACT:')) return baseContext;
  return [baseContext, OUTPUT_CONTRACT_INSTRUCTION].filter(Boolean).join('\n\n');
}

function waitForRetry(delayMs, signal) {
  if (!delayMs) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener('abort', abort);
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, delayMs);
    const abort = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(signal.reason || new DOMException('The operation was aborted.', 'AbortError'));
    };
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener('abort', abort, { once: true });
  });
}

function buildDetectionFallback(detection = {}) {
  const label = String(detection.label || 'dental finding').replace(/_/g, ' ');
  const confidence = Number(detection.confidence);
  const confidenceText = Number.isFinite(confidence)
    ? ` dengan confidence detector ${Math.round((confidence <= 1 ? confidence * 100 : confidence))}%`
    : '';
  return {
    mark_id: detection.mark_id || null,
    location: detection.location || detection.tooth_or_region || detection.mark_id || 'Area yang ditandai',
    description: `Detector visual menandai kemungkinan ${label}${confidenceText}. Temuan ini merupakan sinyal skrining dan memerlukan korelasi dengan pemeriksaan klinis serta radiografi tambahan bila diindikasikan.`,
    severity: detection.severity || null,
    confidence: detection.confidence ?? null,
    differentials: Array.isArray(detection.differentials) ? detection.differentials : [],
    label: detection.label || 'AI finding',
    bbox: detection.bbox || null,
  };
}

export function normalizeXCore2DAnalysis(payload) {
  const normalized = normalizeVisualFindings(payload?.visual_findings || payload);
  if (!normalized) return null;

  const detections = Array.isArray(normalized.detections) ? normalized.detections : [];
  const rawFindings = Array.isArray(normalized.findings) ? normalized.findings : [];
  const findings = rawFindings.length > 0
    ? rawFindings.map((finding) => ({
        ...finding,
        location: finding.location || finding.tooth_or_region || null,
        description: finding.description || finding.finding || finding.notes || finding.label || '',
        differentials: Array.isArray(finding.differentials) ? finding.differentials : [],
      }))
    : detections.map(buildDetectionFallback);

  return {
    ...normalized,
    detections,
    findings,
  };
}

export function getXCore2DAnalysisErrorMessage(error) {
  const errorText = getErrorText(error);
  if (error?.status === 413) return 'Ukuran gambar terlalu besar untuk dianalisis.';
  if (error?.status === 429) return 'Layanan AI sedang membatasi permintaan. Coba kembali beberapa saat lagi.';
  if (error?.name === 'AbortError' || error?.code === 'request_timeout' || error?.status === 408) {
    return 'Waktu analisis AI habis sebelum respons selesai. Silakan coba kembali.';
  }
  if (/output[_ ]parsing|failed to parse|pydantic|schema|limitations field|required field/.test(errorText)) {
    return 'Respons AI tidak lengkap setelah beberapa percobaan. Silakan coba kembali.';
  }
  if (error?.status >= 500) {
    return 'Layanan reasoning AI gagal memproses gambar. Coba kembali atau periksa service DeepDental.';
  }
  return error?.message || 'Analisis AI tidak dapat diselesaikan.';
}

export function buildXCore2DAnalysisFormData({
  imageBlob,
  fileName = '',
  context = '',
} = {}) {
  if (!(imageBlob instanceof Blob) || imageBlob.size === 0) {
    throw new XCore2DAnalysisError('The source image is empty.', {
      code: 'xcore_2d_source_image_empty',
    });
  }

  const mimeType = String(imageBlob.type || '').toLowerCase();
  if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) {
    throw new XCore2DAnalysisError(`Unsupported source image type: ${mimeType || 'unknown'}.`, {
      code: 'xcore_2d_source_image_unsupported',
    });
  }

  const safeFileName = fileName || `xcore-2d.${extensionForMimeType(mimeType)}`;
  const formData = new FormData();
  formData.append('image', imageBlob, safeFileName);
  formData.append('context', context);
  formData.append('role', 'dentist');
  formData.append('include_annotated', 'true');
  return formData;
}

export async function analyzeXCore2DSource({
  client,
  imageUrl,
  context,
  signal,
  fetchImpl = fetch,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
} = {}) {
  if (!client?.analyzeImage) {
    throw new XCore2DAnalysisError('DeepDental analysis client is unavailable.', {
      code: 'xcore_2d_analysis_client_unavailable',
    });
  }
  if (!imageUrl) {
    throw new XCore2DAnalysisError('The X-Core source image URL is missing.', {
      code: 'xcore_2d_source_image_missing',
    });
  }

  const sourceResponse = await fetchImpl(imageUrl, {
    method: 'GET',
    credentials: 'same-origin',
    signal,
  });
  if (!sourceResponse.ok) {
    throw new XCore2DAnalysisError(`Unable to load the X-Core source image (${sourceResponse.status}).`, {
      code: 'xcore_2d_source_image_fetch_failed',
      status: sourceResponse.status,
    });
  }

  const imageBlob = await sourceResponse.blob();
  const mimeType = String(imageBlob.type || sourceResponse.headers?.get?.('content-type') || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const normalizedBlob = imageBlob.type === mimeType
    ? imageBlob
    : imageBlob.slice(0, imageBlob.size, mimeType);
  const contractedContext = ensureOutputContract(context);
  let lastError = null;
  for (let attempt = 0; attempt < MAX_ANALYSIS_ATTEMPTS; attempt += 1) {
    const requestContext = attempt === 0
      ? contractedContext
      : `${contractedContext}\n\n${OUTPUT_REPAIR_INSTRUCTION}`;
    const formData = buildXCore2DAnalysisFormData({
      imageBlob: normalizedBlob,
      fileName: `xcore-2d.${extensionForMimeType(mimeType)}`,
      context: requestContext,
    });

    try {
      const payload = await client.analyzeImage(formData, signal);
      const findings = normalizeXCore2DAnalysis(payload);
      if (!findings) {
        throw new XCore2DAnalysisError('DeepDental returned an empty analysis.', {
          code: 'xcore_2d_analysis_empty',
        });
      }
      return findings;
    } catch (error) {
      lastError = error;
      const canRetry =
        attempt < MAX_ANALYSIS_ATTEMPTS - 1 &&
        isRetryableAnalysisError(error, signal);
      if (!canRetry) throw error;
      await waitForRetry(retryDelayMs * (attempt + 1), signal);
    }
  }

  throw lastError || new XCore2DAnalysisError('DeepDental analysis failed.');
}
