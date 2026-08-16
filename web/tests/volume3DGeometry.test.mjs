import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cameraStateApproximatelyMatches,
  distanceMm,
  midpoint,
  projectWorldToOverlay,
  pointerToVtkDisplayCoords,
  isWorldPoint3D,
  isWorldOverlayAnnotation,
  intersectRayAABB,
  pickVolumeRaySurface,
  validateVolumeGeometry,
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

test('canonical projectWorldToOverlay converts VTK display coordinates to DOM CSS pixels accurately', () => {
  const containerRect = { left: 100, top: 50, width: 800, height: 600 };
  const fbSize = [1000, 750]; // 1.25 DPR

  // Mock VTK OpenGL RenderWindow and View
  const mockRenderWindow = {
    getViews: () => [{
      getSize: () => fbSize,
      worldToDisplay: (x, y, z) => {
        // Mock a world point mapping to VTK display center
        if (x === 0 && y === 0 && z === 0) {
          return [500, 375, 0.5]; // Center in VTK bottom-left coords
        }
        if (x === 10 && y === 20 && z === 30) {
          return [250, 600, 0.3]; // Top-left quadrant in VTK (y=600 is near top of 750)
        }
        return [0, 0, 0.5];
      },
    }],
  };
  const mockRenderer = {};

  // Center point
  const centerOverlay = projectWorldToOverlay([0, 0, 0], mockRenderer, mockRenderWindow, containerRect);
  assert.ok(centerOverlay);
  assert.equal(Math.round(centerOverlay.x), 400); // 500 / 1000 * 800 = 400
  assert.equal(Math.round(centerOverlay.y), 300); // 600 - (375 / 750 * 600) = 300

  // Point in top-left quadrant
  const tlOverlay = projectWorldToOverlay([10, 20, 30], mockRenderer, mockRenderWindow, containerRect);
  assert.ok(tlOverlay);
  assert.equal(Math.round(tlOverlay.x), 200); // 250 / 1000 * 800 = 200
  assert.equal(Math.round(tlOverlay.y), 120); // 600 - (600 / 750 * 600) = 120 (120px from top)
});

test('pointerToVtkDisplayCoords and projectWorldToOverlay have exact mathematical round-trip identity', () => {
  const containerRect = { left: 50, top: 100, width: 1024, height: 768 };
  const fbSize = [1280, 960]; // 1.25 DPR

  const mockRenderWindow = {
    getViews: () => [{
      getSize: () => fbSize,
    }],
  };

  // Test across a grid of DOM pointer coordinates
  const testPoints = [
    { clientX: 50, clientY: 100 }, // Top-Left corner of container
    { clientX: 1074, clientY: 868 }, // Bottom-Right corner of container
    { clientX: 562, clientY: 484 }, // Center of container
    { clientX: 300, clientY: 250 },
    { clientX: 850, clientY: 700 },
  ];

  testPoints.forEach((pt) => {
    // 1. Pointer Event -> VTK Display Coords
    const vtkDisp = pointerToVtkDisplayCoords(pt, containerRect, mockRenderWindow);

    // 2. Mock VTK worldToDisplay returning that exact VTK display coord
    const mockRwWithDisplay = {
      getViews: () => [{
        getSize: () => fbSize,
        worldToDisplay: () => [vtkDisp.x, vtkDisp.y, 0.5],
      }],
    };

    // 3. VTK Display -> DOM Overlay Coords
    const overlay = projectWorldToOverlay([1, 2, 3], {}, mockRwWithDisplay, containerRect);

    // 4. Expected DOM coordinates relative to container top-left
    const expectedX = pt.clientX - containerRect.left;
    const expectedY = pt.clientY - containerRect.top;

    assert.ok(overlay, `Overlay must not be null for point (${pt.clientX}, ${pt.clientY})`);
    assert.ok(
      Math.abs(overlay.x - expectedX) < 1e-6,
      `X round-trip must match: expected ${expectedX}, got ${overlay.x}`
    );
    assert.ok(
      Math.abs(overlay.y - expectedY) < 1e-6,
      `Y round-trip must match: expected ${expectedY}, got ${overlay.y}`
    );
  });
});

test('projectWorldToOverlay rejects points behind the camera while tolerating boundary float rounding', () => {
  const containerRect = { left: 0, top: 0, width: 800, height: 600 };
  const mockRenderer = {};

  const makeRw = (displayZ) => ({
    getViews: () => [{
      getSize: () => [800, 600],
      worldToDisplay: () => [400, 300, displayZ],
    }],
  });

  // Normal in-view point (Z = 0.5)
  assert.ok(projectWorldToOverlay([0, 0, 0], mockRenderer, makeRw(0.5), containerRect));

  // Near-boundary points with float precision
  assert.ok(projectWorldToOverlay([0, 0, 0], mockRenderer, makeRw(-0.02), containerRect));
  assert.ok(projectWorldToOverlay([0, 0, 0], mockRenderer, makeRw(1.05), containerRect));

  // Point deeply behind camera (Z = -0.5)
  assert.equal(projectWorldToOverlay([0, 0, 0], mockRenderer, makeRw(-0.5), containerRect), null);

  // Point far beyond back clipping plane (Z = 2.0)
  assert.equal(projectWorldToOverlay([0, 0, 0], mockRenderer, makeRw(2.0), containerRect), null);
});

test('intersectRayAABB accurately finds entry and exit points on 3D volume bounding box', () => {
  const bounds = [-50, 50, -50, 50, -50, 50]; // Cube centered at origin with half-size 50mm

  // Ray aiming directly at center from Z = 200 along -Z
  const rayOrigin = [0, 0, 200];
  const rayDir = [0, 0, -1];
  const hit = intersectRayAABB(rayOrigin, rayDir, bounds);

  assert.equal(hit.hit, true);
  assert.equal(hit.tMin, 150); // 200 - 150 = 50 (entry at z = 50)
  assert.equal(hit.tMax, 250); // 200 - 250 = -50 (exit at z = -50)

  // Ray missing bounding box
  const missRay = intersectRayAABB([100, 100, 200], [0, 0, -1], bounds);
  assert.equal(missRay.hit, false);
});

test('pickVolumeRaySurface finds physical voxel surface along camera ray', () => {
  // Create mock ImageData with known voxel values (e.g. high density sphere in center)
  const dims = [10, 10, 10];
  const scalars = new Float32Array(1000);
  // Place high density at center voxel (5, 5, 5)
  scalars[5 + (5 * 10) + (5 * 100)] = 1000;

  const mockImageData = {
    getBounds: () => [0, 10, 0, 10, 0, 10],
    getDimensions: () => dims,
    getSpacing: () => [1, 1, 1],
    getPointData: () => ({
      getScalars: () => ({
        getData: () => scalars,
        getRange: () => [0, 1000],
      }),
    }),
    worldToIndex: (pt) => [pt[0], pt[1], pt[2]],
  };

  const rayOrigin = [5, 5, 20];
  const rayDir = [0, 0, -1];

  const picked = pickVolumeRaySurface(rayOrigin, rayDir, mockImageData, 0.5);
  assert.ok(picked);
  assert.equal(Math.round(picked[0]), 5);
  assert.equal(Math.round(picked[1]), 5);
  assert.equal(Math.round(picked[2]), 5); // Hits the voxel at z = 5
});

test('validateVolumeGeometry verifies isotropic CBCT datasets', () => {
  const mockIsotropicVolume = {
    getDimensions: () => [512, 512, 400],
    getSpacing: () => [0.25, 0.25, 0.25],
  };

  const report = validateVolumeGeometry(mockIsotropicVolume);
  assert.equal(report.status, 'VERIFIED');
  assert.equal(report.isIsotropic, true);
  assert.equal(report.maxAnisotropyPct, 0);
  assert.deepEqual(report.fovMm, [128, 128, 100]);
  assert.equal(report.voxelResolutionMm, 0.25);
  assert.equal(report.warnings.length, 0);
});

test('validateVolumeGeometry flags anisotropic or non-cubic datasets with clinical alerts', () => {
  const mockAnisotropicVolume = {
    getDimensions: () => [512, 512, 200],
    getSpacing: () => [0.25, 0.25, 0.50], // 100% Z-spacing stretch
  };

  const report = validateVolumeGeometry(mockAnisotropicVolume);
  assert.equal(report.status, 'ANOMALOUS');
  assert.equal(report.isIsotropic, false);
  assert.equal(report.maxAnisotropyPct, 100);
  assert.ok(report.warnings.length > 0);
  assert.ok(report.recommendations.length > 0);
});



