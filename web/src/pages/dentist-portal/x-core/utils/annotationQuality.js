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
    const minPathPoints = type === 'freehand' ? 2 : 3;
    const hasNormalizedPath = Array.isArray(path) && path.length >= minPathPoints && path.every(isPoint);
    const hasWorldPath = annotation.viewer_type === '3d' && Array.isArray(worldPath) && worldPath.length >= minPathPoints && worldPath.every(isWorldPoint3D);
    const hasWorldBrush = annotation.viewer_type === '3d' && isWorldBrush3D(worldBrush);
    if (!hasNormalizedPath && !hasWorldPath && !hasWorldBrush) {
      errors.push(type === 'freehand' ? 'invalid freehand path' : 'invalid region path');
    }
    if (type === 'region' && !(Number(metadata.lesion_area_px) > 0) && !(Number(metadata.lesion_area_mm2) > 0) && !(Number(metadata.lesion_volume_mm3) > 0)) {
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

const dist3 = (a, b) => {
  const dx = Number(a?.[0] || 0) - Number(b?.[0] || 0);
  const dy = Number(a?.[1] || 0) - Number(b?.[1] || 0);
  const dz = Number(a?.[2] || 0) - Number(b?.[2] || 0);
  return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
};

const scoreBucket = (score) => Math.max(0, Math.min(25, Math.round(score)));

export const calculateAnnotationQualityScore = ({
  annotations = [],
  surfaceSamplePoints = [],
  brushRadiusMm = 2.6,
}) => {
  if (!Array.isArray(annotations) || annotations.length === 0) {
    return {
      total: 0,
      dimensions: {
        coverage: { score: 0, reason: 'No annotations available.' },
        severity: { score: 0, reason: 'No annotations available.' },
        findingType: { score: 0, reason: 'No annotations available.' },
        documentation: { score: 0, reason: 'No annotations available.' },
      },
    };
  }

  const brushCenters = annotations.flatMap((annotation) => (
    Array.isArray(annotation?.coordinates?.world_brush?.centers)
      ? annotation.coordinates.world_brush.centers
      : []
  ));
  const effectiveRadius = Math.max(0.5, Number(brushRadiusMm) || 2.6);
  const sampledSurface = Array.isArray(surfaceSamplePoints) ? surfaceSamplePoints.filter((point) => Array.isArray(point) && point.length >= 3) : [];
  let coverageRatio = 0;
  if (sampledSurface.length && brushCenters.length) {
    let covered = 0;
    sampledSurface.forEach((samplePoint) => {
      const nearBrush = brushCenters.some((center) => dist3(center, samplePoint) <= effectiveRadius);
      if (nearBrush) covered += 1;
    });
    coverageRatio = covered / sampledSurface.length;
  } else if (brushCenters.length > 0) {
    coverageRatio = Math.min(1, brushCenters.length / 35);
  }
  const coverageScore = scoreBucket(coverageRatio * 25);
  const coverageReason = coverageRatio > 0
    ? `${Math.round(coverageRatio * 100)}% of sampled bone surface is covered.`
    : 'No brush coverage detected on sampled surface.';

  const severities = annotations
    .map((annotation) => String(annotation?.metadata?.severity || '').toUpperCase())
    .filter(Boolean);
  const severityCounts = severities.reduce((acc, severity) => {
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});
  const severityUnique = Object.keys(severityCounts);
  const dominantShare = severities.length
    ? Math.max(...Object.values(severityCounts)) / severities.length
    : 1;
  let severityScore = 8 + (severityUnique.length * 4);
  if (severityUnique.includes('S1') && severityUnique.includes('S2') && severityUnique.includes('S3') && severityUnique.includes('S4')) {
    severityScore = 25;
  } else if (dominantShare > 0.8) {
    severityScore = Math.max(3, severityScore - 10);
  }
  severityScore = scoreBucket(severityScore);
  const severityReason = `Severities used: ${severityUnique.join(', ') || 'none'}${dominantShare > 0.8 ? ' (dominated by one severity)' : ''}.`;

  const findingTypes = annotations
    .map((annotation) => String(annotation?.metadata?.finding_type || '').trim().toLowerCase())
    .filter(Boolean);
  const findingTypeSet = new Set(findingTypes);
  const hasOtherFinding = findingTypes.includes('other');
  let findingTypeScore = scoreBucket(Math.min(25, findingTypeSet.size * 6));
  if (hasOtherFinding) findingTypeScore = Math.max(0, findingTypeScore - 8);
  const findingTypeReason = hasOtherFinding
    ? 'At least one annotation uses finding type "other".'
    : `${findingTypeSet.size} distinct finding types used.`;

  const documentedCount = annotations.filter((annotation) => String(annotation?.label || '').trim().length > 0).length;
  const documentationRatio = documentedCount / annotations.length;
  const documentationScore = scoreBucket(documentationRatio * 25);
  const documentationReason = `${documentedCount}/${annotations.length} annotations include label text.`;

  const total = coverageScore + severityScore + findingTypeScore + documentationScore;
  return {
    total,
    dimensions: {
      coverage: { score: coverageScore, reason: coverageReason },
      severity: { score: severityScore, reason: severityReason },
      findingType: { score: findingTypeScore, reason: findingTypeReason },
      documentation: { score: documentationScore, reason: documentationReason },
    },
  };
};
