export const RADIOGRAPH_TYPES = Object.freeze([
  'PERIAPICAL',
  'PANORAMIC',
  'BITEWING',
  'OCCLUSAL',
  'CEPHALOMETRIC',
  'OTHER',
]);

export const RADIOGRAPH_LABELS = Object.freeze({
  PERIAPICAL: 'Periapikal',
  PANORAMIC: 'Panoramik',
  BITEWING: 'Bitewing',
  OCCLUSAL: 'Oklusal',
  CEPHALOMETRIC: 'Sefalometrik',
  OTHER: 'Radiografi lain',
});

const VALID_TEETH = new Set([
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48',
]);

export function normalizeToothNumbers(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(String).map((value) => value.trim()).filter(Boolean))];
}

function field(record, snakeCase, camelCase, fallback = undefined) {
  if (record && record[snakeCase] !== undefined) return record[snakeCase];
  if (record && record[camelCase] !== undefined) return record[camelCase];
  return fallback;
}

export function computeSourceInstanceKey(item = {}) {
  const seriesUid = String(field(item, 'series_uid', 'seriesUid', '')).trim();
  const sopInstanceUid = field(item, 'sop_instance_uid', 'sopInstanceUid')
    ? String(field(item, 'sop_instance_uid', 'sopInstanceUid')).trim()
    : null;
  const rawFrameIndex = field(item, 'frame_index', 'frameIndex');
  const frameIndex = rawFrameIndex != null && Number.isInteger(Number(rawFrameIndex)) && Number(rawFrameIndex) >= 0
    ? Number(rawFrameIndex)
    : null;
  const rawImageIndex = field(item, 'image_index', 'imageIndex');
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
  return `series:${seriesUid}:legacy`;
}

export function validateCaseItem(item, index = 0) {
  const errors = [];
  const radiographType = String(field(item, 'radiograph_type', 'radiographType', '')).toUpperCase();
  const toothNumbers = normalizeToothNumbers(field(item, 'tooth_numbers', 'toothNumbers', []));
  if (!field(item, 'study_id', 'studyId')) errors.push('study_id is required');
  if (!String(field(item, 'series_uid', 'seriesUid', '')).trim()) errors.push('series_uid is required');
  if (!RADIOGRAPH_TYPES.includes(radiographType)) errors.push('radiograph_type is invalid');
  if (radiographType === 'PERIAPICAL' && toothNumbers.length === 0) errors.push('PERIAPICAL requires at least one tooth number');
  if (toothNumbers.some((tooth) => !VALID_TEETH.has(tooth))) errors.push('tooth_numbers contains an invalid FDI permanent tooth number');
  const displayOrder = Number(field(item, 'display_order', 'displayOrder', index));
  if (!Number.isInteger(displayOrder) || displayOrder < 0) errors.push('display_order must be a non-negative integer');

  const instanceNumber = field(item, 'instance_number', 'instanceNumber') != null ? Number(field(item, 'instance_number', 'instanceNumber')) : null;
  const frameIndex = field(item, 'frame_index', 'frameIndex') != null ? Number(field(item, 'frame_index', 'frameIndex')) : null;
  const imageIndex = field(item, 'image_index', 'imageIndex') != null ? Number(field(item, 'image_index', 'imageIndex')) : null;

  if (instanceNumber != null && (!Number.isInteger(instanceNumber) || instanceNumber <= 0)) {
    errors.push('instance_number must be a positive integer');
  }
  if (frameIndex != null && (!Number.isInteger(frameIndex) || frameIndex < 0)) {
    errors.push('frame_index must be a non-negative integer');
  }
  if (imageIndex != null && (!Number.isInteger(imageIndex) || imageIndex < 0)) {
    errors.push('image_index must be a non-negative integer');
  }

  const sopInstanceUid = field(item, 'sop_instance_uid', 'sopInstanceUid') ? String(field(item, 'sop_instance_uid', 'sopInstanceUid')).trim() : null;
  const sourceInstanceKey = computeSourceInstanceKey(item);

  return {
    errors,
    radiographType,
    toothNumbers,
    displayOrder,
    sopInstanceUid,
    instanceNumber,
    frameIndex,
    imageIndex,
    sourceInstanceKey,
  };
}

export function buildRadiographSectionLabels(items = []) {
  const totals = new Map();
  const seen = new Map();
  items.forEach((item) => {
    const type = String(item.radiograph_type || item.radiographType || 'OTHER').toUpperCase();
    totals.set(type, (totals.get(type) || 0) + 1);
  });
  return items.map((item) => {
    const type = String(item.radiograph_type || item.radiographType || 'OTHER').toUpperCase();
    seen.set(type, (seen.get(type) || 0) + 1);
    const numbered = (totals.get(type) || 0) > 1 ? ` ${seen.get(type)}` : '';
    const teeth = normalizeToothNumbers(item.tooth_numbers || item.toothNumbers);
    const toothLabel = teeth.length ? ` — Gigi ${teeth.join(', ')}` : '';
    return `${RADIOGRAPH_LABELS[type] || RADIOGRAPH_LABELS.OTHER}${numbered}${toothLabel}`;
  });
}

export function suggestRadiographType(metadata = {}) {
  const haystack = [metadata.modality, metadata.description, metadata.seriesDescription, metadata.fileName, metadata.originalName]
    .filter(Boolean).join(' ').toLowerCase();
  if (/periap|(?:^|[^a-z])pa(?:[^a-z]|$)|iap\b/.test(haystack)) return 'PERIAPICAL';
  if (/panor|opg\b/.test(haystack)) return 'PANORAMIC';
  if (/bite.?wing|bw\b/.test(haystack)) return 'BITEWING';
  if (/occlus|oklusal/.test(haystack)) return 'OCCLUSAL';
  if (/ceph|sefal/.test(haystack)) return 'CEPHALOMETRIC';
  return 'OTHER';
}

export function assertCaseOwner(createdBy, userId) {
  if (String(createdBy) !== String(userId)) {
    throw Object.assign(new Error('You do not have permission to modify this analysis case'), {
      status: 403,
      code: 'case_access_denied',
    });
  }
}

