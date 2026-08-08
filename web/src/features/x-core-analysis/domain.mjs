export const RADIOGRAPH_TYPES = [
  ['PERIAPICAL', 'Periapikal'],
  ['PANORAMIC', 'Panoramik'],
  ['BITEWING', 'Bitewing'],
  ['OCCLUSAL', 'Oklusal'],
  ['CEPHALOMETRIC', 'Sefalometrik'],
  ['OTHER', 'Lainnya'],
];

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

