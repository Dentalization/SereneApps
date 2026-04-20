import {
  computeSyncedSliceIndices,
  quantizeDisplayCoordinate,
  quantizeSliceIndex,
} from './sliceSyncMath';

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const runSliceSyncMathTests = () => {
  const dims = [420, 380, 260];
  const current = { axial: 128, coronal: 164, sagittal: 211 };

  // Repeated clicks around floating point boundaries should resolve to the same target slices.
  const clickA = computeSyncedSliceIndices({
    sourceAxis: 'axial',
    currentIndices: current,
    worldIndexPoint: [210.50000006, 163.49999998, 128.50000003],
    dimensions: dims,
  });

  const clickB = computeSyncedSliceIndices({
    sourceAxis: 'axial',
    currentIndices: current,
    worldIndexPoint: [210.49999994, 163.50000002, 128.49999997],
    dimensions: dims,
  });

  assert(clickA.sagittal === clickB.sagittal, 'Sagittal slice should remain stable on repeated clicks');
  assert(clickA.coronal === clickB.coronal, 'Coronal slice should remain stable on repeated clicks');
  assert(clickA.axial === current.axial, 'Source axis slice must remain unchanged');

  const nearBoundaryLow = quantizeSliceIndex(-0.499999, 120);
  const nearBoundaryHigh = quantizeSliceIndex(120.499999, 120);
  assert(nearBoundaryLow === 0, 'Quantized slice index should clamp low values to 0');
  assert(nearBoundaryHigh === 120, 'Quantized slice index should clamp high values to max');

  const displayA = quantizeDisplayCoordinate(97.2499999);
  const displayB = quantizeDisplayCoordinate(97.2500001);
  assert(displayA === displayB, 'Display coordinate quantization should remove float jitter');

  return true;
};

runSliceSyncMathTests();

export default {
  runSliceSyncMathTests,
};
