const REQUIRED_REVIEW_SURFACES = new Set(['mesial', 'distal', 'occlusal', 'buccal', 'lingual', 'cervical', 'root']);
const REQUIRED_FINDING_TYPES = new Set(['caries', 'bone_resorption', 'implant_site', 'fracture', 'periapical_lesion', 'other']);
const REQUIRED_SEVERITIES = new Set(['S1', 'S2', 'S3']);

const isNumber = (value) => Number.isFinite(Number(value));
const isPoint = (point) => point && isNumber(point.x) && isNumber(point.y) && Number(point.x) >= 0 && Number(point.x) <= 1 && Number(point.y) >= 0 && Number(point.y) <= 1;

export const validateAnnotationForReview = (annotation) => {
  const errors = [];
  const type = annotation?.type || annotation?.annotation_type;
  const metadata = annotation?.metadata || {};

  if (!annotation?.id) errors.push('missing id');
  if (!['arrow', 'circle', 'text', 'freehand', 'region'].includes(type)) errors.push('invalid type');
  if (!metadata.source_width || !metadata.source_height) errors.push('missing source dimensions');

  if (type === 'text') {
    if (!isPoint(annotation.coordinates)) errors.push('invalid text point');
    return errors;
  }

  if (!REQUIRED_FINDING_TYPES.has(metadata.finding_type)) errors.push('missing finding type');
  if (!REQUIRED_SEVERITIES.has(metadata.severity)) errors.push('missing severity');
  if (!metadata.tooth_number) errors.push('missing tooth number');
  if (!REQUIRED_REVIEW_SURFACES.has(metadata.surface)) errors.push('missing tooth surface');

  if (type === 'arrow' || type === 'circle') {
    if (!isPoint(annotation.coordinates?.start) || !isPoint(annotation.coordinates?.end)) {
      errors.push('invalid start/end coordinates');
    }
  }

  if (type === 'region' || type === 'freehand') {
    const path = annotation.coordinates?.path;
    if (!Array.isArray(path) || path.length < 3 || !path.every(isPoint)) {
      errors.push('invalid region path');
    }
    if (!(Number(metadata.lesion_area_px) > 0)) errors.push('missing lesion area');
  }

  return errors;
};

export const getAnnotationReviewIssues = (annotations = []) => annotations
  .map((annotation, index) => ({
    id: annotation.id,
    index,
    errors: validateAnnotationForReview(annotation),
  }))
  .filter((item) => item.errors.length > 0);
