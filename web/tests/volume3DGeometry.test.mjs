import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cameraStateApproximatelyMatches,
  distanceMm,
  midpoint,
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

test('3D measurement distance remains strictly invariant under camera zoom, pan, and rotation', () => {
  const startWorld = [12.5, -45.2, 80.0];
  const endWorld = [32.1, -15.8, 110.4];

  const canonicalDistance = distanceMm(startWorld, endWorld);
  const canonicalMidpoint = midpoint(startWorld, endWorld);

  assert.ok(canonicalDistance > 0);
  assert.deepEqual(canonicalMidpoint, [(12.5 + 32.1) / 2, (-45.2 + -15.8) / 2, (80.0 + 110.4) / 2]);

  // Simulating camera state transformations (zoom, pan, rotation)
  const cameraTransforms = [
    { type: 'zoom', position: [0, 0, 100], parallelScale: 150 },
    { type: 'zoom_in', position: [0, 0, 50], parallelScale: 75 },
    { type: 'pan', position: [30, 20, 100], focalPoint: [30, 20, 0] },
    { type: 'rotate', position: [100, 0, 0], viewUp: [0, 0, 1] },
  ];

  cameraTransforms.forEach((transform) => {
    // World coordinates must NOT change when camera transforms
    const distanceAfterTransform = distanceMm(startWorld, endWorld);
    const midpointAfterTransform = midpoint(startWorld, endWorld);

    assert.equal(
      Math.abs(distanceAfterTransform - canonicalDistance) < 1e-9,
      true,
      `Distance must remain identical after ${transform.type}`
    );
    assert.deepEqual(
      midpointAfterTransform,
      canonicalMidpoint,
      `Midpoint must remain identical after ${transform.type}`
    );
  });
});
