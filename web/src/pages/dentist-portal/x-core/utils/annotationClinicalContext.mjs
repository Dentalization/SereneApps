export const SLICE_CLINICAL_PLANES = ['axial', 'coronal', 'sagittal'];

const toIntegerOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

export const normalizeSliceClinicalContext = (context = {}, annotation = {}) => {
  const annotationMetadata = annotation?.metadata || {};
  const planeCandidate = String(
    annotation?.slice_axis
    ?? annotation?.sliceAxis
    ?? annotationMetadata.slice_axis
    ?? annotationMetadata.anatomical_plane
    ?? context.sliceAxis
    ?? context.slice_axis
    ?? ''
  ).toLowerCase();
  const sliceAxis = SLICE_CLINICAL_PLANES.includes(planeCandidate) ? planeCandidate : null;
  const sliceIndex = toIntegerOrNull(
    annotation?.slice_index
    ?? annotation?.sliceIndex
    ?? annotationMetadata.slice_index
    ?? context.sliceIndex
    ?? context.slice_index
  );
  const sliceCountCandidate = toIntegerOrNull(
    annotationMetadata.slice_count
    ?? context.sliceCount
    ?? context.slice_count
  );
  const sliceCount = sliceCountCandidate !== null && sliceCountCandidate > 0
    ? sliceCountCandidate
    : null;

  if (!sliceAxis || sliceIndex === null || sliceIndex < 0) return null;

  return {
    viewer_type: 'slice',
    coordinate_context: 'slice_plane',
    anatomical_plane: sliceAxis,
    slice_axis: sliceAxis,
    slice_index: sliceIndex,
    slice_number: sliceIndex + 1,
    ...(sliceCount ? { slice_count: sliceCount } : {}),
  };
};
