export const RADIOGRAPH_TYPES = [
  ['PERIAPICAL', 'Periapikal'],
  ['PANORAMIC', 'Panoramik'],
  ['BITEWING', 'Bitewing'],
  ['OCCLUSAL', 'Oklusal'],
  ['CEPHALOMETRIC', 'Sefalometrik'],
  ['OTHER', 'Lainnya'],
];

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
