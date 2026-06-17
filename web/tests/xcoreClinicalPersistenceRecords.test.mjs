import assert from 'node:assert/strict';
import test from 'node:test';

import {
  build2DMeasurementRecord,
  build3DMeasurementRecords,
  buildSliceMeasurementRecord,
  isPersistedMeasurementRecord,
  measurement2DFromRecord,
  measurements3DFromRecords,
} from '../src/pages/dentist-portal/x-core/utils/clinicalPersistenceRecords.mjs';

test('2d measurements persist as normalized clinical measurement records and hydrate back to image pixels', () => {
  const record = build2DMeasurementRecord({
    id: 'm-1',
    start: { x: 100, y: 50 },
    end: { x: 300, y: 150 },
    metadata: { calibration_method: 'manual', pixel_spacing_mm: 0.2 },
  }, {
    seriesUid: '1.2.3',
    viewerType: '2d',
    sourceWidth: 1000,
    sourceHeight: 500,
    pixelSpacing: 0.2,
    calibrationMethod: 'manual',
  });

  assert.equal(record.type, 'measurement');
  assert.equal(record.annotation_type, 'measurement');
  assert.equal(record.coordinates.coordinate_space, 'normalized_image');
  assert.deepEqual(record.coordinates.start, { x: 0.1, y: 0.1 });
  assert.deepEqual(record.coordinates.end, { x: 0.3, y: 0.3 });
  assert.equal(record.metadata.distance_mm, 44.721);
  assert.equal(record.metadata.ai_training_ready, true);
  assert.equal(isPersistedMeasurementRecord(record), true);

  const hydrated = measurement2DFromRecord(record, { sourceWidth: 1000, sourceHeight: 500 });
  assert.deepEqual(hydrated.start, { x: 100, y: 50 });
  assert.deepEqual(hydrated.end, { x: 300, y: 150 });
  assert.equal(hydrated.id, 'm-1');
});

test('3d point and polyline measurements persist with world coordinates and hydrate by kind', () => {
  const records = build3DMeasurementRecords({
    measurements3D: [{
      id: 'p-1',
      pointA: [1, 2, 3],
      pointB: [4, 6, 3],
      midpoint: [2.5, 4, 3],
      distance: 5,
      label: 'Implant clearance',
      labelOffset: { x: 18, y: -12 },
    }],
    polylineMeasurements: [{
      id: 'l-1',
      type: 'polyline',
      points: [[1, 1, 1], [2, 1, 1], [2, 2, 1]],
      segments: [1, 1],
      totalDistance: 2,
      labelOffset: { x: -9, y: 24 },
    }],
  }, {
    seriesUid: '1.2.3',
    viewerType: '3d',
    sourceWidth: 900,
    sourceHeight: 700,
  });

  assert.equal(records.length, 2);
  assert.equal(records[0].metadata.measurement_kind, 'distance_3d');
  assert.deepEqual(records[0].coordinates.world_start, [1, 2, 3]);
  assert.deepEqual(records[0].metadata.label_offset_px, { x: 18, y: -12 });
  assert.equal(records[1].metadata.measurement_kind, 'polyline_3d');
  assert.deepEqual(records[1].coordinates.world_points, [[1, 1, 1], [2, 1, 1], [2, 2, 1]]);
  assert.deepEqual(records[1].metadata.label_offset_px, { x: -9, y: 24 });

  const hydrated = measurements3DFromRecords(records);
  assert.equal(hydrated.measurements3D.length, 1);
  assert.equal(hydrated.polylineMeasurements.length, 1);
  assert.equal(hydrated.measurements3D[0].id, 'p-1');
  assert.equal(hydrated.polylineMeasurements[0].id, 'l-1');
  assert.deepEqual(hydrated.measurements3D[0].labelOffset, { x: 18, y: -12 });
  assert.deepEqual(hydrated.polylineMeasurements[0].labelOffset, { x: -9, y: 24 });
});

test('slice widget measurements persist as world-space clinical records', () => {
  const factory = {
    getDistance: () => 8.25,
    getWidgetState: () => ({
      getHandle1: () => ({ getOrigin: () => [1, 2, 3] }),
      getHandle2: () => ({ getOrigin: () => [5, 2, 3] }),
    }),
  };

  const record = buildSliceMeasurementRecord({
    id: 'slice-distance-1',
    type: 'distance',
    factory,
  }, 'axial', {
    seriesUid: '1.2.3',
    sourceWidth: 512,
    sourceHeight: 512,
    sliceIndex: 42,
    spacing: [0.2, 0.2, 0.3],
    dimensions: [512, 512, 120],
  });

  assert.equal(record.type, 'measurement');
  assert.equal(record.viewer_type, 'slice');
  assert.equal(record.slice_axis, 'axial');
  assert.equal(record.slice_index, 42);
  assert.equal(record.metadata.measurement_kind, 'distance_slice');
  assert.deepEqual(record.coordinates.world_start, [1, 2, 3]);
  assert.deepEqual(record.coordinates.world_end, [5, 2, 3]);
});
