import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeObserved, observedAgreement } from '../../scripts/xcore-benchmark/summarize-single-folder-benchmark.js';

test('missing benchmark observations cannot become perfect agreement or zero memory', () => {
  assert.equal(observedAgreement(0, 0), null);
  assert.deepEqual(summarizeObserved([NaN, undefined, null]), { avg: null, sd: null, observations: 0 });
});
test('benchmark summaries retain units and expose observed sample count', () => {
  assert.deepEqual(summarizeObserved([1000, 2000, NaN], .001), { avg: 1.5, sd: Math.sqrt(.5), observations: 2 });
  assert.deepEqual(summarizeObserved([20]), { avg: 20, sd: null, observations: 1 });
  assert.equal(observedAgreement(2, 4), 50);
});
