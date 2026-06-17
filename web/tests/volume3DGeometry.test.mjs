import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cameraStateApproximatelyMatches,
} from '../src/pages/dentist-portal/x-core/components/3D/volume3DGeometry.js';

const cameraState = (position, focalPoint = [0, 0, 0], viewUp = [0, 1, 0]) => ({
  position,
  focal_point: focalPoint,
  view_up: viewUp,
});

test('camera matching is based on view direction instead of absolute camera millimeters', () => {
  const expected = cameraState([0, 0, 250]);
  const sameDirectionDifferentDistance = cameraState([0, 0, 500]);

  assert.equal(cameraStateApproximatelyMatches(expected, sameDirectionDifferentDistance), true);
});

test('camera matching rejects materially different camera angles', () => {
  const expected = cameraState([0, 0, 250]);
  const rotatedSideView = cameraState([250, 0, 0]);

  assert.equal(cameraStateApproximatelyMatches(expected, rotatedSideView), false);
});
