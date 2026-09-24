// Contract verification only. Temporary assets are software fixtures, never research data.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'scan3d-engine-tests-'));
process.env.SCAN3D_STORAGE_ROOT = root;
const { reconstructionEngineRegistry: registry } = await import('../src/services/scan3D/engines/reconstructionEngineRegistry.js');
const { PhotogrammetryNativeEngine } = await import('../src/services/scan3D/engines/photogrammetryNativeEngine.js');
const { runLidraAcquisition } = await import('../src/services/scan3D/lidraService.js');
const { runReconstruction } = await import('../src/services/scan3D/reconstructionEngineAdapter.js');
const { DentalMeshFilter } = await import('../src/services/scan3D/pipeline/dentalMeshFilter.js');
const { resolveExperimentConfiguration } = await import('../src/services/scan3D/experimentConfiguration.js');
const { sha256File } = await import('../src/services/scan3D/scanStorage.js');
after(() => fs.rm(root, { recursive: true, force: true }));

test('research names describe unavailable scaffolds and cannot run another algorithm', async () => {
  for (const name of ['colmap', 'dust3r', 'mast3r', 'neuralangelo', 'abot_recon']) {
    const engine = registry.get(name);
    const descriptor = engine.getDescriptor();
    assert.equal(descriptor.implementationStatus, 'scaffold');
    assert.equal(descriptor.available, false);
    assert.equal(descriptor.version, null);
    assert.equal(descriptor.validated, false);
    await assert.rejects(engine.process({}), { code: 'ENGINE_UNAVAILABLE' });
  }
  assert.throws(() => registry.get('nonexistent'), { code: 'UNKNOWN_ENGINE' });
  assert.equal(registry.getDefaultEngine().name, 'opencv_sparse_sfm');
  assert.equal(registry.getDefaultEngine().getDescriptor().availability, 'unverified');
});

test('procedural fixture is never a real reconstruction fallback', async () => {
  const engine = new PhotogrammetryNativeEngine();
  assert.equal(engine.getDescriptor().implementationStatus, 'simulation');
  await assert.rejects(engine.process({ study: { id: 1 }, studyDir: root }), { code: 'SYNTHETIC_ENGINE_FORBIDDEN' });
  await assert.rejects(runReconstruction({ id: 1 }, { engine: 'photogrammetry_v1' }), { code: 'ENGINE_UNAVAILABLE' });
});

test('missing video yields unavailable acquisition with no synthetic frames or scores', async () => {
  const result = await runLidraAcquisition({ folderName: 'SCAN-3D-missing', metadata: { storageVersion: 'private_v1' } });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.qualityScore, null);
  assert.equal(result.coverage.status, 'unavailable');
  assert.deepEqual(result.selectedFrames, []);
  assert.deepEqual(await fs.readdir(root), []);
});

test('unconfigured acquisition service returns a specific failure code', async () => {
  const folderName = 'SCAN-3D-no-token';
  const studyDir = path.join(root, folderName);
  const outputDir = path.join(studyDir, 'attempts', 'controlled');
  await fs.mkdir(studyDir, { recursive: true });
  await fs.writeFile(path.join(studyDir, 'raw_video.mp4'), 'CONTROLLED CONTRACT FIXTURE');
  const originalToken = process.env.SCAN3D_SERVICE_TOKEN;
  delete process.env.SCAN3D_SERVICE_TOKEN;
  try {
    const result = await runLidraAcquisition({ folderName, metadata: { storageVersion: 'private_v1', video: { fileName: 'raw_video.mp4' } } }, { outputDir });
    assert.equal(result.status, 'unavailable');
    assert.equal(result.failureCode, 'SCAN_SERVICE_NOT_CONFIGURED');
    assert.deepEqual(result.selectedFrames, []);
  } finally {
    if (originalToken === undefined) delete process.env.SCAN3D_SERVICE_TOKEN;
    else process.env.SCAN3D_SERVICE_TOKEN = originalToken;
  }
});

test('unreachable acquisition service is distinguished from rejected capture', async () => {
  const folderName = 'SCAN-3D-service-offline';
  const studyDir = path.join(root, folderName);
  await fs.mkdir(studyDir, { recursive: true });
  await fs.writeFile(path.join(studyDir, 'raw_video.mp4'), 'CONTROLLED CONTRACT FIXTURE');
  const originalToken = process.env.SCAN3D_SERVICE_TOKEN;
  const originalFetch = globalThis.fetch;
  process.env.SCAN3D_SERVICE_TOKEN = 'test-only-service-token';
  globalThis.fetch = async () => { throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } }); };
  try {
    const result = await runLidraAcquisition({ folderName, metadata: { storageVersion: 'private_v1', video: { fileName: 'raw_video.mp4' } } },
      { outputDir: path.join(studyDir, 'attempts', 'controlled') });
    assert.equal(result.status, 'unavailable');
    assert.equal(result.failureCode, 'ACQUISITION_SERVICE_UNAVAILABLE');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.SCAN3D_SERVICE_TOKEN;
    else process.env.SCAN3D_SERVICE_TOKEN = originalToken;
  }
});

test('acquisition HTTP failures retain actionable codes and retry policy', async (t) => {
  const folderName = 'SCAN-3D-service-contract';
  const studyDir = path.join(root, folderName);
  const outputDir = path.join(studyDir, 'attempts', 'diagnostic');
  await fs.mkdir(studyDir, { recursive: true });
  const videoPath = path.join(studyDir, 'raw_video.mp4');
  await fs.writeFile(videoPath, 'CONTROLLED CONTRACT FIXTURE, NOT RESEARCH VIDEO');
  const study = { id: 123n, folderName, metadata: { storageVersion: 'private_v1',
    video: { fileName: 'raw_video.mp4', checksum: await sha256File(videoPath) } } };
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.SCAN3D_SERVICE_TOKEN;
  process.env.SCAN3D_SERVICE_TOKEN = 'test-only-service-token';
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.SCAN3D_SERVICE_TOKEN;
    else process.env.SCAN3D_SERVICE_TOKEN = originalToken;
  });
  for (const [status, code, retryable] of [
    [400, 'ACQUISITION_REQUEST_INVALID', false],
    [401, 'SCAN_SERVICE_AUTH_FAILED', false],
    [404, 'ACQUISITION_ENDPOINT_UNAVAILABLE', false],
    [422, 'ACQUISITION_CONFIGURATION_INVALID', false],
    [500, 'ACQUISITION_SERVICE_UNAVAILABLE', true],
    [503, 'SCAN_SERVICE_NOT_CONFIGURED', false],
  ]) {
    globalThis.fetch = async () => ({ ok: false, status });
    const acquisition = await runLidraAcquisition(study, { outputDir });
    assert.equal(acquisition.status, 'unavailable');
    assert.equal(acquisition.failureCode, code, `HTTP ${status}`);
    assert.deepEqual(acquisition.selectedFrames, []);
    await assert.rejects(runReconstruction(study, { outputDir }), error => {
      assert.equal(error.code, code, `HTTP ${status}`);
      assert.equal(error.retryable, retryable, `HTTP ${status}`);
      return true;
    });
  }
  globalThis.fetch = async () => { throw new DOMException('Timed out', 'TimeoutError'); };
  const timedOut = await runLidraAcquisition(study, { outputDir });
  assert.equal(timedOut.failureCode, 'ACQUISITION_TIMEOUT');
  await assert.rejects(runReconstruction(study, { outputDir }), { code: 'ACQUISITION_TIMEOUT', retryable: true });
});

test('default post-processing retains all coordinates and explicit face indices', () => {
  const raw = { vertices: [[100, 50, 90], [101, 50, 90], [100, 51, 90]], faces: [[0, 1, 2]], normals: [] };
  const result = DentalMeshFilter.applyDentalFilters(raw, { indexBase: 0 });
  assert.deepEqual(result.vertices, raw.vertices);
  assert.deepEqual(result.faces, raw.faces);
  assert.equal(result.metrics.method, 'identity');
  assert.notEqual(result.vertices, raw.vertices);
  assert.throws(() => DentalMeshFilter.applyDentalFilters(raw), /Invalid triangle/);
  assert.throws(() => DentalMeshFilter.applyDentalFilters(raw, { indexBase: 0, roi: { min: [-2, -2, -2], max: [-1, -1, -1] } }), /excludes all/);
});

test('unknown configuration and nonrigid processing fail explicitly', () => {
  assert.throws(() => resolveExperimentConfiguration({}, { hidden: true }), /Unsupported/);
  assert.throws(() => resolveExperimentConfiguration({}, { reconstruction: { version: 'invented' } }), /Unsupported/);
  assert.throws(() => resolveExperimentConfiguration({}, { postProcessing: { enabled: true } }), /disabled/);
  assert.throws(() => resolveExperimentConfiguration({}, { validation: { registration: 'nonrigid' } }), /rigid/);
});

test('adapter checks provenance and isolates immutable attempt output', async (t) => {
  const folderName = 'SCAN-3D-contract';
  const studyDir = path.join(root, folderName);
  const outputDir = path.join(studyDir, 'attempts', 'contract');
  await fs.mkdir(outputDir, { recursive: true });
  const videoPath = path.join(studyDir, 'raw_video.mp4');
  await fs.writeFile(videoPath, 'CONTROLLED CONTRACT FIXTURE, NOT REAL VIDEO');
  const study = { id: 1n, patientId: 2n, dentistId: 3n, folderName,
    metadata: { storageVersion: 'private_v1', video: { fileName: 'raw_video.mp4', checksum: await sha256File(videoPath) } } };
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.SCAN3D_SERVICE_TOKEN;
  process.env.SCAN3D_SERVICE_TOKEN = 'test-only-service-token';
  t.after(() => { globalThis.fetch = originalFetch; if (originalToken === undefined) delete process.env.SCAN3D_SERVICE_TOKEN; else process.env.SCAN3D_SERVICE_TOKEN = originalToken; });
  let responseMode = 'valid';
  const contractFrames = [0, 1].map(frameIndex => ({ frameIndex, sha256: 'a'.repeat(64) }));
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-only-service-token');
    const body = JSON.parse(options.body);
    assert.equal(body.outputDir, outputDir);
    if (url.endsWith('/lidra/analyze')) return { ok: true, json: async () => ({ status: 'ready', qualityScore: null,
      qualityDecision: { status: 'accepted' }, version: 'test-contract',
      videoMetadata: { sha256: study.metadata.video.checksum }, selectedFrames: contractFrames }) };
    await fs.writeFile(path.join(outputDir, 'mesh.obj'), '# SOFTWARE CONTRACT FIXTURE\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n');
    return { ok: true, json: async () => ({ success: true, assets: { mesh: { fileName: 'mesh.obj',
      sha256: responseMode === 'wrong-output' ? '0'.repeat(64) : await sha256File(path.join(outputDir, 'mesh.obj')),
      sizeInBytes: (await fs.stat(path.join(outputDir, 'mesh.obj'))).size } },
      metadata: { engine: 'opencv_sparse_sfm', engineVersion: 'contract-test', synthetic: false,
        geometrySource: 'image_derived', coordinateSystem: 'first_camera_right_down_forward',
        configuration: { resolvedFixtureSetting: true }, reproducibility: { scope: 'mock-contract-only' },
        selectedFrames: responseMode === 'wrong-frames' ? [{ ...contractFrames[0], sha256: 'b'.repeat(64) }, contractFrames[1]] : contractFrames,
        input: { sha256: responseMode === 'wrong-input' ? '0'.repeat(64) : study.metadata.video.checksum } }, cameraTrajectory: [] }) };
  };
  const result = await runReconstruction(study, { outputDir, attemptId: 'contract' });
  assert.equal(result.provenance.geometrySource, 'image_derived');
  assert.equal(result.confidence, null);
  assert.equal(result.capabilities.measurementCapability, 'visualization_only');
  assert.equal(result.assets.mesh.storagePath, path.join('attempts', 'contract', 'mesh.obj'));
  assert.equal(result.assets.mesh.checksum, await sha256File(path.join(outputDir, 'mesh.obj')));
  assert.equal(result.metrics.postProcessing.processedAsset, null);
  assert.equal(JSON.parse(await fs.readFile(path.join(outputDir, 'provenance.json'))).synthetic, false);
  assert.deepEqual(result.provenance.configuration, { resolvedFixtureSetting: true });
  responseMode = 'wrong-input';
  await assert.rejects(runReconstruction(study, { outputDir }), { code: 'RECONSTRUCTION_PROVENANCE_MISMATCH' });
  responseMode = 'wrong-output';
  await assert.rejects(runReconstruction(study, { outputDir }), { code: 'RECONSTRUCTION_ASSET_MISMATCH' });
  responseMode = 'wrong-frames';
  await assert.rejects(runReconstruction(study, { outputDir }), { code: 'ACQUISITION_FRAME_MISMATCH' });
  await fs.writeFile(videoPath, 'TAMPERED');
  await assert.rejects(runReconstruction(study, { outputDir, attemptId: 'contract' }), { code: 'VIDEO_CORRUPT' });
});

test('legacy reports cannot expose fabricated LIDRA scores, poses or engine metrics', async () => {
  const { publicScanMetadata } = await import('../src/services/scan3D/scanIntegrity.js');
  const result = publicScanMetadata({ lidra: { qualityScore: 88, coverage: { coverageScore: 96 } },
    cameraTrajectory: [{ position: [0, 1, 2] }], metrics: { engine: 'neuralangelo', confidence: .99 } });
  assert.equal(result.lidra.status, 'unavailable');
  assert.equal(result.lidra.qualityScore, null);
  assert.equal(result.metrics, null);
  assert.deepEqual(result.cameraTrajectory, []);
});
