const REQUIRED_REVIEW_SURFACES = new Set(['mesial', 'distal', 'occlusal', 'buccal', 'lingual', 'cervical', 'root']);
const REQUIRED_FINDING_TYPES = new Set(['caries', 'bone_resorption', 'implant_site', 'fracture', 'periapical_lesion', 'other']);
const REQUIRED_SEVERITIES = new Set(['S1', 'S2', 'S3']);

const isNumber = (value) => Number.isFinite(Number(value));
const isPoint = (point) => point && isNumber(point.x) && isNumber(point.y) && Number(point.x) >= 0 && Number(point.x) <= 1 && Number(point.y) >= 0 && Number(point.y) <= 1;
const isWorldPoint3D = (point) => Array.isArray(point) && point.length >= 3 && point.every(isNumber);
const isWorldBrush3D = (brush) => brush && Array.isArray(brush.centers) && brush.centers.length >= 1 && brush.centers.every(isWorldPoint3D) && isNumber(brush.radius_mm) && Number(brush.radius_mm) > 0;
const isWorldLine3D = (coordinates) => coordinates && isWorldPoint3D(coordinates.world_start) && isWorldPoint3D(coordinates.world_end);
const isWorldText3D = (coordinates) => coordinates && isWorldPoint3D(coordinates.world_point);

export const validateAnnotationForReview = (annotation) => {
  const errors = [];
  const type = annotation?.type || annotation?.annotation_type;
  const metadata = annotation?.metadata || {};

  if (!annotation?.id) errors.push('missing id');
  if (!['arrow', 'circle', 'text', 'freehand', 'region'].includes(type)) errors.push('invalid type');
  if (!metadata.source_width || !metadata.source_height) errors.push('missing source dimensions');

  if (type === 'text') {
    if (!isPoint(annotation.coordinates) && !(annotation.viewer_type === '3d' && isWorldText3D(annotation.coordinates))) {
      errors.push('invalid text point');
    }
    return errors;
  }

  if (!REQUIRED_FINDING_TYPES.has(metadata.finding_type)) errors.push('missing finding type');
  if (!REQUIRED_SEVERITIES.has(metadata.severity)) errors.push('missing severity');
  if (!metadata.tooth_number) errors.push('missing tooth number');
  if (!REQUIRED_REVIEW_SURFACES.has(metadata.surface)) errors.push('missing tooth surface');

  if (type === 'arrow' || type === 'circle') {
    const hasNormalizedLine = isPoint(annotation.coordinates?.start) && isPoint(annotation.coordinates?.end);
    const hasWorldLine = annotation.viewer_type === '3d' && isWorldLine3D(annotation.coordinates);
    if (!hasNormalizedLine && !hasWorldLine) {
      errors.push('invalid start/end coordinates');
    }
  }

  if (type === 'region' || type === 'freehand') {
    const path = annotation.coordinates?.path;
    const worldPath = annotation.coordinates?.world_path;
    const worldBrush = annotation.coordinates?.world_brush;
    const hasNormalizedPath = Array.isArray(path) && path.length >= 3 && path.every(isPoint);
    const hasWorldPath = annotation.viewer_type === '3d' && Array.isArray(worldPath) && worldPath.length >= 3 && worldPath.every(isWorldPoint3D);
    const hasWorldBrush = annotation.viewer_type === '3d' && isWorldBrush3D(worldBrush);
    if (!hasNormalizedPath && !hasWorldPath && !hasWorldBrush) {
      errors.push('invalid region path');
    }
    if (!(Number(metadata.lesion_area_px) > 0) && !(Number(metadata.lesion_area_mm2) > 0) && !(Number(metadata.lesion_volume_mm3) > 0)) {
      errors.push('missing lesion area');
    }
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
