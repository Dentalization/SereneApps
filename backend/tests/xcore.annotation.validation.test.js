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
