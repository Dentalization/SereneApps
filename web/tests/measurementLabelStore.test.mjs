import test from 'node:test';
import assert from 'node:assert/strict';

import { createMeasurementLabelPositionStore } from '../src/pages/dentist-portal/x-core/components/3D/measurementLabelStore.mjs';

test('measurement label store only notifies subscribers for changed ids', () => {
  const store = createMeasurementLabelPositionStore();
  let aCalls = 0;
  let bCalls = 0;

  const unsubscribeA = store.subscribe('a', () => {
    aCalls += 1;
  });
  const unsubscribeB = store.subscribe('b', () => {
    bCalls += 1;
  });

  store.setPositions(new Map([
    ['a', { x: 10, y: 20 }],
  ]));

  assert.equal(aCalls, 1);
  assert.equal(bCalls, 0);
  assert.deepEqual(store.getPosition('a'), { x: 10, y: 20 });
  assert.equal(store.getPosition('b'), null);

  store.setPositions(new Map([
    ['a', { x: 10, y: 20 }],
    ['b', { x: 30, y: 40 }],
  ]));

  assert.equal(aCalls, 1);
  assert.equal(bCalls, 1);

  unsubscribeA();
  unsubscribeB();
});

test('measurement label store notifies when positions are removed', () => {
  const store = createMeasurementLabelPositionStore();
  let removed = 0;

  const unsubscribe = store.subscribe('gone', () => {
    removed += 1;
  });

  store.setPositions(new Map([
    ['gone', { x: 10, y: 10 }],
  ]));
  store.setPositions(new Map());

  assert.equal(removed, 2);
  assert.equal(store.getPosition('gone'), null);
  unsubscribe();
});
