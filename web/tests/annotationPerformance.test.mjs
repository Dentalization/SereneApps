import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSurfaceAnchor,
  createInteractionQualityController,
  createRafInputScheduler,
} from '../src/pages/dentist-portal/x-core/utils/annotationPerformance.mjs';
import { createVolume3DAnnotationCanvasController } from '../src/pages/dentist-portal/x-core/components/3D/volume3DAnnotationCanvasRenderer.mjs';

test('rAF input scheduler coalesces pointer samples to the latest sample', () => {
  const frames = [];
  const processed = [];
  const scheduler = createRafInputScheduler({
    requestFrame: (callback) => {
      frames.push(callback);
      return frames.length;
    },
    cancelFrame: () => {},
  });

  scheduler.push({ x: 1, y: 1 }, (sample) => processed.push(sample));
  scheduler.push({ x: 2, y: 2 }, (sample) => processed.push(sample));
  scheduler.push({ x: 3, y: 3 }, (sample) => processed.push(sample));

  assert.equal(frames.length, 1);
  frames.shift()(16);

  assert.deepEqual(processed, [{ x: 3, y: 3 }]);
  assert.equal(scheduler.isPending(), false);
});

test('3D annotation canvas controller coalesces draft updates into one draw', () => {
  const frames = [];
  const operations = [];
  const context = new Proxy({}, {
    get: (_, key) => {
      if (key === 'canvas') return null;
      return (...args) => operations.push([key, ...args]);
    },
    set: (_, key, value) => {
      operations.push([`set:${key}`, value]);
      return true;
    },
  });
  const canvas = {
    width: 300,
    height: 200,
    getContext: () => context,
  };
  const controller = createVolume3DAnnotationCanvasController({
    getCanvas: () => canvas,
    getDevicePixelRatio: () => 2,
    requestFrame: (callback) => {
      frames.push(callback);
      return frames.length;
    },
    cancelFrame: () => {},
  });

  controller.update({
    brushPath: [{ x: 10, y: 12 }],
    brushRadius: 4,
    brushActive: true,
  });
  controller.update({
    tracePath: [{ x: 1, y: 2 }, { x: 5, y: 8 }],
  });

  assert.equal(frames.length, 1);
  frames.shift()(16);

  assert.deepEqual(controller.getState(), {
    brushPath: [{ x: 10, y: 12 }],
    tracePath: [{ x: 1, y: 2 }, { x: 5, y: 8 }],
    traceSnapToClose: false,
    brushRadius: 4,
    brushActive: true,
  });
  assert.equal(operations.filter(([name]) => name === 'clearRect').length, 1);
  assert.ok(operations.some(([name]) => name === 'lineTo'));
  assert.ok(operations.some(([name]) => name === 'arc'));
});

test('interaction quality controller applies temporary quality and restores base quality once', () => {
  const calls = [];
  const mapper = {
    setSampleDistance: (value) => calls.push(['sample', value]),
    setMaximumSamplesPerRay: (value) => calls.push(['samples', value]),
  };
  const restored = [];
  const controller = createInteractionQualityController({
    getMapper: () => mapper,
    applyBaseQuality: () => restored.push('base'),
    render: () => calls.push(['render']),
    interactiveSampleDistance: 1.6,
    interactiveMaxSamplesPerRay: 320,
  });

  controller.begin();
  controller.begin();
  controller.end();

  assert.deepEqual(calls, [
    ['sample', 1.6],
    ['samples', 320],
    ['render'],
    ['render'],
  ]);
  assert.deepEqual(restored, ['base']);
});

test('surface anchors are compact and preserve stable placement fields', () => {
  const anchor = buildSurfaceAnchor({
    point: [1.123456, 2.987654, 3.444444],
    normal: [0, 0.3333333, 0.942809],
    cellId: 42,
    barycentric: [0.2, 0.3, 0.5],
    meshRevision: 'jaw-v1',
    screenOffsetPx: [10.444, -2.222],
    confidence: 0.9349,
  });

  assert.deepEqual(anchor, {
    surface_point: [1.123, 2.988, 3.444],
    surface_normal: [0, 0.333333, 0.942809],
    surface_cell_id: 42,
    barycentric: [0.2, 0.3, 0.5],
    mesh_revision: 'jaw-v1',
    screen_offset_px: [10.44, -2.22],
    placement_confidence: 0.935,
  });
});
