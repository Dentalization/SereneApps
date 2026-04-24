import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAnnotationPayload } from '../src/utils/xCoreAnnotationValidation.js';

const base = {
  id: 'annotation-1',
  seriesUid: '1.2.3',
  viewerType: '2d',
  reviewStatus: 'draft',
  metadata: {
    source_width: 1000,
    source_height: 500,
    finding_type: 'caries',
    severity: 'S2',
  },
};

test('accepts draft region with normalized polygon geometry', () => {
  const result = validateAnnotationPayload({
    ...base,
    type: 'region',
    coordinates: {
      path: [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.1 },
        { x: 0.2, y: 0.2 },
      ],
    },
    metadata: {
      ...base.metadata,
      lesion_area_px: 100,
    },
  });

  assert.equal(result.valid, true);
});

test('accepts draft 3d region with world-space surface path geometry', () => {
  const result = validateAnnotationPayload({
    ...base,
    viewerType: '3d',
    type: 'region',
    coordinates: {
      world_path: [
        [10.2, 18.4, 22.1],
        [11.8, 18.9, 22.4],
        [11.5, 20.1, 22.8],
      ],
      closed: true,
    },
    metadata: {
      ...base.metadata,
      lesion_area_mm2: 12.4,
    },
  });

  assert.equal(result.valid, true);
});

test('accepts draft 3d region with volumetric brush geometry', () => {
  const result = validateAnnotationPayload({
    ...base,
    viewerType: '3d',
    type: 'region',
    coordinates: {
      world_brush: {
        centers: [
          [14.1, 20.2, 31.4],
          [14.8, 20.5, 31.9],
          [15.4, 21.0, 32.1],
        ],
        radius_mm: 2.8,
      },
    },
    metadata: {
      ...base.metadata,
      lesion_volume_mm3: 28.6,
    },
  });

  assert.equal(result.valid, true);
});

test('accepts draft 3d arrow with world-space line geometry', () => {
  const result = validateAnnotationPayload({
    ...base,
    viewerType: '3d',
    type: 'arrow',
    coordinates: {
      world_start: [14.1, 20.2, 31.4],
      world_end: [18.8, 24.2, 33.1],
    },
  });

  assert.equal(result.valid, true);
});

test('accepts draft 3d text with world-space point geometry', () => {
  const result = validateAnnotationPayload({
    ...base,
    viewerType: '3d',
    type: 'text',
    coordinates: {
      world_point: [11.4, 12.1, 18.2],
    },
  });

  assert.equal(result.valid, true);
});

test('rejects malformed normalized coordinates', () => {
  const result = validateAnnotationPayload({
    ...base,
    type: 'arrow',
    coordinates: {
      start: { x: 0.2, y: 0.3 },
      end: { x: 1.2, y: 0.5 },
    },
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /normalized start\/end/);
});

test('requires clinical segmentation metadata before review submission', () => {
  const result = validateAnnotationPayload({
    ...base,
    reviewStatus: 'submitted',
    type: 'region',
    coordinates: {
      path: [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.1 },
        { x: 0.2, y: 0.2 },
      ],
    },
    metadata: {
      ...base.metadata,
      lesion_area_px: 100,
    },
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /tooth_number/);
  assert.match(result.errors.join(' '), /surface/);
});
