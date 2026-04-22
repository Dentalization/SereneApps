const ANNOTATION_TYPES = new Set(['arrow', 'circle', 'text', 'freehand', 'region']);
const VIEWER_TYPES = new Set(['2d', 'slice', '3d']);
const REVIEW_STATUSES = new Set(['draft', 'submitted', 'approved', 'rejected']);
const FINDING_TYPES = new Set(['caries', 'bone_resorption', 'implant_site', 'fracture', 'periapical_lesion', 'other']);
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
    errors.push('type must be arrow, circle, text, freehand, or region');
  }
  if (!isObject(annotation?.coordinates)) {
    errors.push('coordinates must be an object');
  }

  if (annotation?.type === 'text') {
    if (!isNormalizedPoint(annotation.coordinates)) {
      errors.push('text coordinates must be {x,y} normalized to 0..1');
    }
  } else if (annotation?.type === 'arrow' || annotation?.type === 'circle') {
    if (!isNormalizedPoint(annotation.coordinates?.start) || !isNormalizedPoint(annotation.coordinates?.end)) {
      errors.push(`${annotation.type} coordinates must include normalized start/end points`);
    }
  } else if (annotation?.type === 'region' || annotation?.type === 'freehand') {
    const path = annotation.coordinates?.path;
    if (!Array.isArray(path) || path.length < 3 || !path.every(isNormalizedPoint)) {
      errors.push('region coordinates must include a normalized path with at least 3 points');
    }
  }

  if (!isObject(annotation?.metadata)) {
    errors.push('metadata must be an object');
  } else {
    const metadata = annotation.metadata;
    if (annotation.type !== 'text') {
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
      if (annotation.type !== 'text') {
        if (!metadata.tooth_number) {
          errors.push('metadata.tooth_number is required before review');
        }
        if (!SURFACES.has(metadata.surface)) {
          errors.push('metadata.surface is required before review');
        }
      }
      if ((annotation.type === 'region' || annotation.type === 'freehand') && !(Number(metadata.lesion_area_px) > 0)) {
        errors.push('metadata.lesion_area_px is required for region review');
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
