const TARGET_TYPES = new Set(['physical_cast', 'patient_teeth']);
const VIEWS = new Set(['left', 'front', 'right', 'occlusal']);

export function normalizeOperatorCaptureReview(value) {
  if (value == null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || !TARGET_TYPES.has(value.targetType)
      || value.physicalTargetVisible !== true || value.crownSurfacesVisible !== true
      || !Array.isArray(value.reviewedViews) || value.reviewedViews.length > VIEWS.size
      || value.reviewedViews.some(view => !VIEWS.has(view))
      || typeof value.reviewedAt !== 'string' || value.reviewedAt.length > 64
      || !Number.isFinite(Date.parse(value.reviewedAt))) {
    throw Object.assign(new Error('Invalid operator capture review'), { status: 400, code: 'INVALID_CAPTURE_REVIEW' });
  }
  return { status: 'operator_declared_unverified', method: 'operator_self_report',
    targetType: value.targetType, physicalTargetVisible: true, crownSurfacesVisible: true,
    reviewedViews: [...new Set(value.reviewedViews)], reviewedAt: new Date(value.reviewedAt).toISOString(),
    anatomicalCoverage: 'unavailable', physicalTargetServerVerified: false };
}
