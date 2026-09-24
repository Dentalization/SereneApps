import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveScanAssetCapability, scanAnnotationStorageKey, scanAssetPath, readBoundedAsset } from '../src/pages/dentist-portal/x-core/components/3D/scan3DAssetSafety.mjs';
import { createScanViewerTelemetry } from '../src/pages/dentist-portal/x-core/components/3D/scan3DViewerTelemetry.mjs';

test('legacy, synthetic, merely ready and unscaled assets cannot measure', () => {
  for (const asset of [{}, { status: 'ready', confidence: 0.99 }, { measurementCapability: 'validated_measurement' },
    { measurementCapability: 'research_measurement', units: 'mm', scale: { status: 'unvalidated' } }]) {
    assert.equal(resolveScanAssetCapability(asset).capability, 'visualization_only');
  }
});

test('research measurement requires explicit real geometry, scale and validation evidence', () => {
  const evidence = { measurementCapability: 'research_measurement', units: 'mm', coordinateSystem: 'reference_rigid',
    scale: { status: 'validated' }, provenance: { synthetic: false }, validation: { status: 'validated' } };
  assert.equal(resolveScanAssetCapability(evidence).capability, 'research_measurement');
  assert.equal(resolveScanAssetCapability({ ...evidence, provenance: { synthetic: true } }).canMeasure, false);
  assert.equal(resolveScanAssetCapability({ ...evidence, measurementCapability: 'validated_measurement' }).canMeasure, false);
});

test('annotation identity changes with geometry and user and rejects unversioned legacy state', () => {
  const input = { scanId: 1, ownerId: 2, asset: { sha256: 'a'.repeat(64) } };
  assert.notEqual(scanAnnotationStorageKey(input), scanAnnotationStorageKey({ ...input, ownerId: 3 }));
  assert.notEqual(scanAnnotationStorageKey(input), scanAnnotationStorageKey({ ...input, asset: { sha256: 'b'.repeat(64) } }));
  assert.equal(scanAnnotationStorageKey({ ...input, asset: {} }), null);
});

test('asset discovery rejects other scans, paths, external origins and traversal', () => {
  assert.equal(scanAssetPath(1, { assetUrl: '/v1/x-core/3d-scans/1/assets/raw_mesh.ply' }), '/api/v1/x-core/3d-scans/1/assets/raw_mesh.ply');
  for (const path of ['/v1/x-core/3d-scans/2/assets/mesh.stl', 'https://other.invalid/mesh.stl',
    '/v1/x-core/3d-scans/1/assets/../mesh.stl', '/v1/x-core/3d-scans/1/assets/%2e%2e/mesh.stl']) {
    assert.equal(scanAssetPath(1, { assetUrl: path }), null);
  }
});

test('diagnostic mesh path is exact, scoped, and cannot enable measurements', () => {
  const descriptor = { assetUrl: '/v1/x-core/3d-scans/1/diagnostic-mesh', diagnosticOnly: true,
    format: 'obj', sha256: 'a'.repeat(64), measurementCapability: 'visualization_only' };
  assert.equal(scanAssetPath(1, descriptor), '/api/v1/x-core/3d-scans/1/diagnostic-mesh');
  assert.equal(resolveScanAssetCapability(descriptor).canMeasure, false);
  assert.equal(scanAssetPath(2, descriptor), null);
  assert.equal(scanAssetPath(1, { ...descriptor, diagnosticOnly: false }), null);
  assert.equal(scanAssetPath(1, { ...descriptor, assetUrl: `${descriptor.assetUrl}/../assets/mesh.obj` }), null);
});

test('bounded download rejects both declared and streaming oversized files', async () => {
  await assert.rejects(readBoundedAsset(new Response(new Uint8Array(8), { headers: { 'Content-Length': '8' } }), 4));
  await assert.rejects(readBoundedAsset(new Response(new Uint8Array(8)), 4));
  assert.equal((await readBoundedAsset(new Response(new Uint8Array(4)), 4)).byteLength, 4);
});

test('telemetry records observed intervals with bounded samples and never fabricates GPU/FPS', () => {
  let clock = 20;
  const telemetry = createScanViewerTelemetry({ now: () => clock });
  const start = telemetry.start();
  clock = 25;
  telemetry.record('load', start);
  telemetry.fact('downloadBytes', 123);
  const result = telemetry.snapshot();
  assert.equal(result.durationsMs.load.latest, 5);
  assert.equal(result.facts.downloadBytes, 123);
  assert.equal(result.fps, null);
  assert.equal(result.gpuMemoryBytes, null);
  assert.equal(result.durationsMs.interaction, undefined);
  for (let i = 0; i < 1000; i++) telemetry.record('load', start);
  assert.equal(telemetry.snapshot().durationsMs.load.count, 240);
});
