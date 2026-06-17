const ANNOTATION_TYPES = new Set(['arrow', 'circle', 'text', 'freehand', 'region', 'brush', 'measurement']);
const VIEWER_TYPES = new Set(['2d', 'slice', '3d']);
const REVIEW_STATUSES = new Set(['draft', 'submitted', 'approved', 'rejected']);
const FINDING_TYPES = new Set(['caries', 'bone_resorption', 'implant_site', 'fracture', 'periapical_lesion', 'measurement', 'other']);
const SEVERITIES = new Set(['S1', 'S2', 'S3']);
const SURFACES = new Set(['mesial', 'distal', 'occlusal', 'buccal', 'lingual', 'cervical', 'root']);

export const isObject = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));

export const isNormalizedPoint = (point) => (
  isObject(point)
  && Number.isFinite(Number(point.x))
  && Number.isFinite(Number(point.y))
  && Number(point.x) >= 0
  && Number(point.x) <= 1
  && Number(point.y) >= 0
  && Number(point.y) <= 1
);

export const isWorldPoint3D = (point) => (
  Array.isArray(point)
  && point.length >= 3
  && point.every((value) => Number.isFinite(Number(value)))
);

export const isWorldBrush3D = (brush) => (
  isObject(brush)
  && Array.isArray(brush.centers)
  && brush.centers.length >= 1
  && brush.centers.every(isWorldPoint3D)
  && Number.isFinite(Number(brush.radius_mm))
  && Number(brush.radius_mm) > 0
);

export const isWorldLine3D = (coordinates) => (
  isObject(coordinates)
  && isWorldPoint3D(coordinates.world_start)
  && isWorldPoint3D(coordinates.world_end)
);

export const isWorldText3D = (coordinates) => (
  isObject(coordinates)
  && isWorldPoint3D(coordinates.world_point)
);

const hasNormalizedLine = (coordinates) => (
  isNormalizedPoint(coordinates?.start)
  && isNormalizedPoint(coordinates?.end)
);

const hasNormalizedPointPath = (coordinates, minPoints = 2) => (
  Array.isArray(coordinates?.points)
  && coordinates.points.length >= minPoints
  && coordinates.points.every(isNormalizedPoint)
);

const hasWorldPointPath = (coordinates, minPoints = 2) => (
  Array.isArray(coordinates?.world_points)
  && coordinates.world_points.length >= minPoints
  && coordinates.world_points.every(isWorldPoint3D)
);

const isMeasurementRecordType = (annotation) => annotation?.type === 'measurement';

export const validateAnnotationPayload = (annotation) => {
  const errors = [];
  if (!annotation?.id || typeof annotation.id !== 'string') {
    errors.push('id is required');
  }
  if (!annotation?.seriesUid) {
    errors.push('series_uid is required');
  }
  if (!VIEWER_TYPES.has(annotation?.viewerType)) {
    errors.push('viewer_type must be 2d, slice, or 3d');
  }
  if (!ANNOTATION_TYPES.has(annotation?.type)) {
    errors.push('type must be arrow, circle, text, freehand, region, brush, or measurement');
  }
  if (!isObject(annotation?.coordinates)) {
    errors.push('coordinates must be an object');
  }

  if (annotation?.type === 'text') {
    const hasNormalizedTextPoint = isNormalizedPoint(annotation.coordinates);
    const hasWorldTextPoint = annotation?.viewerType === '3d' && isWorldText3D(annotation.coordinates);
    if (!hasNormalizedTextPoint && !hasWorldTextPoint) {
      errors.push('text coordinates must be normalized {x,y} or a 3d world_point');
    }
  } else if (annotation?.type === 'arrow' || annotation?.type === 'circle') {
    const hasNormalizedAnnotationLine = hasNormalizedLine(annotation.coordinates);
    const hasWorldLine = annotation?.viewerType === '3d' && isWorldLine3D(annotation.coordinates);
    if (!hasNormalizedAnnotationLine && !hasWorldLine) {
      errors.push(`${annotation.type} coordinates must include normalized start/end points or 3d world_start/world_end points`);
    }
  } else if (annotation?.type === 'region' || annotation?.type === 'freehand' || annotation?.type === 'brush') {
    const path = annotation.coordinates?.path;
    const worldPath = annotation.coordinates?.world_path;
    const worldBrush = annotation.coordinates?.world_brush;
    const hasNormalizedPath = Array.isArray(path) && path.length >= 3 && path.every(isNormalizedPoint);
    const hasWorldPath = annotation?.viewerType === '3d'
      && Array.isArray(worldPath)
      && worldPath.length >= 3
      && worldPath.every(isWorldPoint3D);
    const hasWorldBrush = annotation?.viewerType === '3d' && isWorldBrush3D(worldBrush);
    if (!hasNormalizedPath && !hasWorldPath && !hasWorldBrush) {
      errors.push('region coordinates must include a normalized path, 3d world_path, or 3d world_brush geometry');
    }
  } else if (annotation?.type === 'measurement') {
    const hasNormalizedMeasurement = hasNormalizedLine(annotation.coordinates) || hasNormalizedPointPath(annotation.coordinates, 2);
    const hasWorldMeasurement = isWorldLine3D(annotation.coordinates) || hasWorldPointPath(annotation.coordinates, 2);
    if (!hasNormalizedMeasurement && !hasWorldMeasurement) {
      errors.push('measurement coordinates must include normalized start/end, normalized points, world_start/world_end, or world_points geometry');
    }
  }

  if (!isObject(annotation?.metadata)) {
    errors.push('metadata must be an object');
  } else {
    const metadata = annotation.metadata;
    if (annotation.type !== 'text' && !isMeasurementRecordType(annotation)) {
      if (!FINDING_TYPES.has(metadata.finding_type)) {
        errors.push('metadata.finding_type is required');
      }
      if (!SEVERITIES.has(metadata.severity)) {
        errors.push('metadata.severity is required');
      }
    }

    const reviewReady = annotation.reviewStatus === 'submitted' || annotation.reviewStatus === 'approved';
    if (reviewReady) {
      if (!metadata.source_width || !metadata.source_height) {
        errors.push('metadata.source_width and source_height are required before review');
      }
      if (annotation.type !== 'text' && !isMeasurementRecordType(annotation)) {
        if (!metadata.tooth_number) {
          errors.push('metadata.tooth_number is required before review');
        }
        if (!SURFACES.has(metadata.surface)) {
          errors.push('metadata.surface is required before review');
        }
      }
      if (
        (annotation.type === 'region' || annotation.type === 'freehand' || annotation.type === 'brush')
        && !(Number(metadata.lesion_area_px) > 0)
        && !(Number(metadata.lesion_area_mm2) > 0)
        && !(Number(metadata.lesion_volume_mm3) > 0)
      ) {
        errors.push('metadata.lesion_area_px, metadata.lesion_area_mm2, or metadata.lesion_volume_mm3 is required for region review');
      }
    }
  }

  if (!REVIEW_STATUSES.has(annotation?.reviewStatus)) {
    errors.push('review_status must be draft, submitted, approved, or rejected');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const hasRequiredReviewMetadata = (annotation) => (
  validateAnnotationPayload({
    ...annotation,
    reviewStatus: 'submitted',
  }).valid
);
