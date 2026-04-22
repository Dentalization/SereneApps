import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProjectedImageBounds,
  isProjectionFrameCurrent,
} from '../src/pages/dentist-portal/x-core/utils/annotationProjection.mjs';

test('marks projection frame stale when VTK viewport still has the old size', () => {
  assert.equal(isProjectionFrameCurrent({
    containerWidth: 1200,
    containerHeight: 800,
    viewportWidthCss: 900,
    viewportHeightCss: 600,
  }), false);
});

test('accepts projection frame after resize/render dimensions are synchronized', () => {
  assert.equal(isProjectionFrameCurrent({
    containerWidth: 1200,
    containerHeight: 800,
    viewportWidthCss: 1201,
    viewportHeightCss: 799,
  }), true);
});

test('does not produce annotation bounds from stale projected corners', () => {
  const bounds = buildProjectedImageBounds({
    viewportWidth: 1200,
    viewportHeight: 800,
    projectedCorners: [
      { x: 100, y: 100, frameCurrent: true },
      { x: 1100, y: 100, frameCurrent: false },
      { x: 1100, y: 700, frameCurrent: true },
      { x: 100, y: 700, frameCurrent: true },
    ],
  });

  assert.equal(bounds, null);
});

test('single and quad projections use the same bounded image-rect calculation', () => {
  const corners = [
    { x: 20, y: 30, frameCurrent: true },
    { x: 500, y: 30, frameCurrent: true },
    { x: 500, y: 360, frameCurrent: true },
    { x: 20, y: 360, frameCurrent: true },
  ];

  assert.deepEqual(buildProjectedImageBounds({
    viewportWidth: 520,
    viewportHeight: 380,
    projectedCorners: corners,
  }), {
    x: 20,
    y: 30,
    width: 480,
    height: 330,
  });
});
