import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizedToViewportPoint,
  polygonAreaPx,
  simplifyPath,
  viewportToNormalizedPoint,
} from '../src/pages/dentist-portal/x-core/utils/annotationGeometry.mjs';

test('round trips normalized image coordinates through zoom/pan transform', () => {
  const context = {
    viewportSize: { width: 1000, height: 800 },
    imageSize: { width: 500, height: 400 },
    zoom: 3,
    pan: { x: 120, y: -80 },
  };
  const source = { x: 0.34, y: 0.62 };
  const viewportPoint = normalizedToViewportPoint(source, context);
  const result = viewportToNormalizedPoint({ ...context, point: viewportPoint });

  assert.ok(Math.abs(result.x - source.x) < 1e-9);
  assert.ok(Math.abs(result.y - source.y) < 1e-9);
});

test('round trips normalized image coordinates through rendered image bounds', () => {
  const context = {
    viewportSize: { width: 1200, height: 900 },
    imageSize: { width: 600, height: 300 },
    imageBounds: { x: 150, y: 100, width: 900, height: 450 },
  };
  const source = { x: 0.72, y: 0.18 };
  const viewportPoint = normalizedToViewportPoint(source, context);
  const result = viewportToNormalizedPoint({ ...context, point: viewportPoint });

  assert.ok(Math.abs(result.x - source.x) < 1e-9);
  assert.ok(Math.abs(result.y - source.y) < 1e-9);
});

test('computes stable region area in source pixels', () => {
  const square = [
    { x: 0.1, y: 0.1 },
    { x: 0.3, y: 0.1 },
    { x: 0.3, y: 0.3 },
    { x: 0.1, y: 0.3 },
  ];
  assert.equal(Math.round(polygonAreaPx(square, { width: 1000, height: 500 })), 20000);
});

test('simplifies freehand path without moving endpoints', () => {
  const path = [
    { x: 0.1, y: 0.1 },
    { x: 0.2, y: 0.1005 },
    { x: 0.3, y: 0.1 },
    { x: 0.4, y: 0.4 },
  ];
  const simplified = simplifyPath(path, 2, { width: 1000, height: 1000 });
  assert.deepEqual(simplified[0], path[0]);
  assert.deepEqual(simplified[simplified.length - 1], path[path.length - 1]);
  assert.ok(simplified.length < path.length);
});
