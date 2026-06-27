import { normalizeVisualFindings } from '../../ai/components/deepDentalSchemas.mjs';

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
  ].join(' ');
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
  const formData = buildXCore2DAnalysisFormData({
    imageBlob: normalizedBlob,
    fileName: `xcore-2d.${extensionForMimeType(mimeType)}`,
    context,
  });
  const payload = await client.analyzeImage(formData, signal);
  const findings = normalizeVisualFindings(payload?.visual_findings || payload);

  if (!findings) {
    throw new XCore2DAnalysisError('DeepDental returned an empty analysis.', {
      code: 'xcore_2d_analysis_empty',
    });
  }

  return findings;
}
