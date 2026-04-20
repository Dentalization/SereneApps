export const SLICE_QUANTIZATION_EPSILON = 1e-4;
export const DISPLAY_COORDINATE_STEP = 0.5;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const quantizeDisplayCoordinate = (value, step = DISPLAY_COORDINATE_STEP) => {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value;
  return Math.round(value / step) * step;
};

export const quantizeSliceIndex = (value, max, epsilon = SLICE_QUANTIZATION_EPSILON) => {
  if (!Number.isFinite(value)) return 0;
  const safeMax = Math.max(Number.isFinite(max) ? max : 0, 0);
  const quantizedValue = Math.round(value / epsilon) * epsilon;
  return clamp(Math.round(quantizedValue), 0, safeMax);
};

export const computeSyncedSliceIndices = ({ sourceAxis, currentIndices, worldIndexPoint, dimensions }) => {
  if (!Array.isArray(worldIndexPoint) || worldIndexPoint.length < 3) {
    return currentIndices;
  }

  const safeCurrent = currentIndices || { axial: 0, coronal: 0, sagittal: 0 };
  const dims = Array.isArray(dimensions) ? dimensions : [1, 1, 1];

  const nextIndices = {
    axial: sourceAxis === 'axial'
      ? safeCurrent.axial
      : quantizeSliceIndex(worldIndexPoint[2], Math.max((dims[2] || 1) - 1, 0)),
    coronal: sourceAxis === 'coronal'
      ? safeCurrent.coronal
      : quantizeSliceIndex(worldIndexPoint[1], Math.max((dims[1] || 1) - 1, 0)),
    sagittal: sourceAxis === 'sagittal'
      ? safeCurrent.sagittal
      : quantizeSliceIndex(worldIndexPoint[0], Math.max((dims[0] || 1) - 1, 0)),
  };

  if (
    nextIndices.axial === safeCurrent.axial
    && nextIndices.coronal === safeCurrent.coronal
    && nextIndices.sagittal === safeCurrent.sagittal
  ) {
    return safeCurrent;
  }

  return nextIndices;
};
