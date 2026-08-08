export const RADIOGRAPH_TYPES = [
  ['PERIAPICAL', 'Periapikal'],
  ['PANORAMIC', 'Panoramik'],
  ['BITEWING', 'Bitewing'],
  ['OCCLUSAL', 'Oklusal'],
  ['CEPHALOMETRIC', 'Sefalometrik'],
  ['OTHER', 'Lainnya'],
];

/**
 * SOURCE_KIND classifies the raw imaging source, independent of radiograph type.
 * This distinction is critical for:
 *  1. Pixel-perfect routing (DICOM → DicomHandler, STATIC_* → direct file serve)
 *  2. viewer_type inference (DICOM 2D → '2d', DICOM 3D → 'slice', Static → '2d')
 *  3. annotation scope isolation (each source_kind uses different instance keys)
 */
export const SOURCE_KIND = Object.freeze({
  DICOM: 'DICOM',             // Native .dcm file with full DICOM metadata
  STATIC_JPG: 'STATIC_JPG',  // Pre-rendered JPEG from Python vti_converter
  STATIC_PNG: 'STATIC_PNG',  // Standalone PNG/JPG image in study folder
  MORITA: 'MORITA',          // J. Morita proprietary format
});

export const REPORT_RENDER_STATUS = Object.freeze({
  READY: { label: 'Siap untuk laporan', tone: 'ready' },
  STALE: { label: 'Perlu diperbarui', tone: 'stale' },
  MISSING: { label: 'Belum siap', tone: 'missing' },
  LEGACY: { label: 'Render lama', tone: 'legacy' },
  INVALID: { label: 'Render tidak valid', tone: 'invalid' },
});

export function reportRenderStatusPresentation(status) {
  return REPORT_RENDER_STATUS[String(status || '').toUpperCase()] || REPORT_RENDER_STATUS.MISSING;
}

export function suggestRadiographType(source = {}) {
  const text = [source.modality, source.description, source.series_description, source.originalName, source.original_name]
    .filter(Boolean).join(' ').toLowerCase();
  if (/periap|(?:^|[^a-z])pa(?:[^a-z]|$)|iap\b/.test(text)) return 'PERIAPICAL';
  if (/panor|opg\b/.test(text)) return 'PANORAMIC';
  if (/bite.?wing|bw\b/.test(text)) return 'BITEWING';
  if (/occlus|oklusal/.test(text)) return 'OCCLUSAL';
  if (/ceph|sefal/.test(text)) return 'CEPHALOMETRIC';
  return 'OTHER';
}

export function caseItemLabel(item, items = []) {
  const label = Object.fromEntries(RADIOGRAPH_TYPES)[item.radiograph_type] || 'Radiografi';
  const sameType = items.filter((candidate) => candidate.radiograph_type === item.radiograph_type);
  const position = sameType.findIndex((candidate) => candidate.id === item.id);
  const number = sameType.length > 1 ? ` ${position + 1}` : '';
  const teeth = item.tooth_numbers?.length ? ` — Gigi ${item.tooth_numbers.join(', ')}` : '';
  return `${label}${number}${teeth}`;
}

export function resolveSeriesUid(series = {}) {
  return String(series.series_uid || series.seriesUid || series.uid || series.id || '');
}

/**
 * Infer viewer_type from SOURCE_KIND and series classification.
 *  - Static images (STATIC_JPG, STATIC_PNG, MORITA) are always '2d'
 *  - DICOM 2D series → '2d'
 *  - DICOM 3D series (CT/MR/3D Volume) → 'slice'
 */
export function resolveViewerTypeFromSource(series = {}, sourceKind = null) {
  // Static sources are always rendered in 2D viewer
  if (sourceKind && [SOURCE_KIND.STATIC_JPG, SOURCE_KIND.STATIC_PNG, SOURCE_KIND.MORITA].includes(sourceKind)) {
    return '2d';
  }
  // Series type attribute from Gallery
  const seriesType = series.type || series.classification || '';
  if (seriesType === '3D Volume' || seriesType === '3D') return 'slice';
  if (seriesType === '2D Image' || seriesType === '2D') return '2d';
  // Modality-based fallback
  const modality = String(series.modality || '').toUpperCase();
  const native3d = new Set(['CT', 'MR', 'PT', 'NM']);
  if (native3d.has(modality)) return 'slice';
  return '2d';
}

export function computeSourceInstanceKey(item = {}) {
  const seriesUid = resolveSeriesUid(item);
  const sopInstanceUid = item.sop_instance_uid || item.sopInstanceUid
    ? String(item.sop_instance_uid || item.sopInstanceUid).trim()
    : null;
  const rawFrameIndex = item.frame_index ?? item.frameIndex;
  const frameIndex = rawFrameIndex != null && Number.isInteger(Number(rawFrameIndex)) && Number(rawFrameIndex) >= 0
    ? Number(rawFrameIndex)
    : null;
  const rawImageIndex = item.image_index ?? item.imageIndex;
  const imageIndex = rawImageIndex != null && Number.isInteger(Number(rawImageIndex)) && Number(rawImageIndex) >= 0
    ? Number(rawImageIndex)
    : null;

  if (sopInstanceUid) {
    if (frameIndex != null) {
      return `sop:${sopInstanceUid}:frame:${frameIndex}`;
    }
    return `sop:${sopInstanceUid}`;
  }
  if (imageIndex != null) {
    return `series:${seriesUid}:image:${imageIndex}`;
  }
  return item.source_instance_key || item.sourceInstanceKey || `series:${seriesUid}:legacy`;
}
