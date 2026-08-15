import test from 'node:test';
import assert from 'node:assert/strict';

import {
  INTERACTION_STATE,
  createInteractionQualityController,
  createProjectionCache,
  createRafInputScheduler,
  createRenderCoalescer,
} from '../src/pages/dentist-portal/x-core/utils/annotationPerformance.mjs';

test('interaction quality controller transitions IDLE -> INTERACTING -> SETTLING -> IDLE with debouncing', async () => {
  const mapperCalls = [];
  const mapper = {
    setSampleDistance: (v) => mapperCalls.push(['sampleDistance', v]),
    setMaximumSamplesPerRay: (v) => mapperCalls.push(['maxSamples', v]),
  };
  const events = [];
  const stateChanges = [];

  const controller = createInteractionQualityController({
    getMapper: () => mapper,
    applyBaseQuality: () => events.push('restored_base_quality'),
    render: () => events.push('render'),
    interactiveSampleDistance: 1.5,
    interactiveMaxSamplesPerRay: 300,
    settleDelayMs: 40,
  });

  const unsubscribe = controller.subscribe((state) => {
    stateChanges.push(state);
  });

  assert.equal(controller.getState(), INTERACTION_STATE.IDLE);
  assert.equal(controller.isActive(), false);

  // 1. Begin interaction
  controller.begin();
  assert.equal(controller.getState(), INTERACTION_STATE.INTERACTING);
  assert.equal(controller.isActive(), true);
  assert.deepEqual(mapperCalls, [
    ['sampleDistance', 1.5],
    ['maxSamples', 300],
  ]);
  assert.deepEqual(events, ['render']);

  // 2. Redundant begin should not reapply mapper settings
  controller.begin();
  assert.equal(mapperCalls.length, 2);
  assert.equal(events.length, 2);

  // 3. End interaction enters SETTLING
  controller.end({ delayMs: 30 });
  assert.equal(controller.getState(), INTERACTION_STATE.SETTLING);
  assert.equal(controller.isActive(), true);

  // 4. Interacting again during settling cancels settling and returns to INTERACTING
  controller.begin();
  assert.equal(controller.getState(), INTERACTION_STATE.INTERACTING);

  // 5. End interaction and let settling timer complete
  controller.end({ delayMs: 20 });
  assert.equal(controller.getState(), INTERACTION_STATE.SETTLING);

  await new Promise((resolve) => setTimeout(resolve, 35));

  assert.equal(controller.getState(), INTERACTION_STATE.IDLE);
  assert.equal(controller.isActive(), false);
  assert.ok(events.includes('restored_base_quality'));

  unsubscribe();
});

test('interaction quality controller settleNow flushes immediately to IDLE', () => {
  const mapper = {
    setSampleDistance: () => {},
    setMaximumSamplesPerRay: () => {},
  };
  let restored = false;

  const controller = createInteractionQualityController({
    getMapper: () => mapper,
    applyBaseQuality: () => { restored = true; },
    render: () => {},
    interactiveSampleDistance: 1.2,
    interactiveMaxSamplesPerRay: 250,
    settleDelayMs: 500,
  });

  controller.begin();
  assert.equal(controller.getState(), INTERACTION_STATE.INTERACTING);

  controller.settleNow();
  assert.equal(controller.getState(), INTERACTION_STATE.IDLE);
  assert.equal(restored, true);
});

test('render coalescer collapses multiple requestRender calls in a single frame', () => {
  const renderCalls = [];
  const frames = [];

  const coalescer = createRenderCoalescer({
    render: (reason) => renderCalls.push(reason),
    requestFrame: (cb) => {
      frames.push(cb);
      return frames.length;
    },
    cancelFrame: (id) => {
      const idx = id - 1;
      if (frames[idx]) frames[idx] = null;
    },
  });

  coalescer.requestRender('pointer1');
  coalescer.requestRender('pointer2');
  coalescer.requestRender('pointer3');

  assert.equal(frames.length, 1);
  assert.equal(coalescer.isPending(), true);

  // Flush the frame
  frames[0]();

  assert.deepEqual(renderCalls, ['pointer3']);
  assert.equal(coalescer.isPending(), false);
});

test('render coalescer renderNow executes immediately and cancels pending frame', () => {
  const renderCalls = [];
  const frames = [];

  const coalescer = createRenderCoalescer({
    render: (reason) => renderCalls.push(reason),
    requestFrame: (cb) => {
      frames.push(cb);
      return frames.length;
    },
    cancelFrame: () => {},
  });

  coalescer.requestRender('deferred');
  assert.equal(coalescer.isPending(), true);

  coalescer.renderNow('immediate');
  assert.equal(coalescer.isPending(), false);
  assert.deepEqual(renderCalls, ['immediate']);
});

test('projection cache invalidates on camera transform change and preserves hits for unchanged camera', () => {
  const cache = createProjectionCache();

  const cameraKeyA = 'posA_fpA_upA_1000x800';
  const cameraKeyB = 'posB_fpB_upB_1000x800';

  cache.set(cameraKeyA, '10,20,30', { x: 100, y: 150 });
  cache.set(cameraKeyA, '40,50,60', { x: 200, y: 250 });

  assert.deepEqual(cache.get(cameraKeyA, '10,20,30'), { x: 100, y: 150 });
  assert.deepEqual(cache.get(cameraKeyA, '40,50,60'), { x: 200, y: 250 });

  // Switch camera transform: automatically clears old camera entries
  assert.equal(cache.get(cameraKeyB, '10,20,30'), undefined);

  cache.set(cameraKeyB, '10,20,30', { x: 110, y: 160 });
  assert.deepEqual(cache.get(cameraKeyB, '10,20,30'), { x: 110, y: 160 });
});

test('rAF input scheduler coalesces 100 high-frequency samples into 1 display frame update', () => {
  const processed = [];
  const frames = [];

  const scheduler = createRafInputScheduler({
    requestFrame: (cb) => {
      frames.push(cb);
      return frames.length;
    },
    cancelFrame: () => {},
  });

  for (let i = 0; i < 100; i += 1) {
    scheduler.push({ clientX: i, clientY: i * 2 }, (sample) => {
      processed.push(sample);
    });
  }

  assert.equal(frames.length, 1);
  frames[0](16);

  assert.equal(processed.length, 1);
  assert.deepEqual(processed[0], { clientX: 99, clientY: 198 });
});
