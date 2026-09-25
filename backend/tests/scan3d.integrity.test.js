import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createScanQueue, MAX_SCAN_ATTEMPTS } from '../src/services/scan3D/scan3DQueueService.js';
import { createScanWorker } from '../src/services/scan3D/scan3DWorker.js';
import { inspectVideo, parseVideoProbe } from '../src/services/scan3D/videoInspection.js';
import { confinedExistingFile, registeredAsset, safeComponent, sha256File } from '../src/services/scan3D/scanStorage.js';
import { publicScanMetadata, publicScanState, clientScanMetadata, associatedPatientWhere, assertRealSegmentation } from '../src/services/scan3D/scanIntegrity.js';
import { assessScanGeometry, GEOMETRY_INSUFFICIENT_CODE } from '../src/services/scan3D/scanGeometryQuality.js';
import { isPrivateScanProxyPath } from '../src/services/scan3D/scanPublicAccess.js';

const initialServiceToken = process.env.SCAN3D_SERVICE_TOKEN;
process.env.SCAN3D_SERVICE_TOKEN = 'scan3d-contract-test-token';
after(() => {
  if (initialServiceToken === undefined) delete process.env.SCAN3D_SERVICE_TOKEN;
  else process.env.SCAN3D_SERVICE_TOKEN = initialServiceToken;
});

const execute = promisify(execFile);
const registry = { list: () => [
  { name: 'opencv_sparse_sfm', implementationStatus: 'experimental', isAvailable: null },
  { name: 'photogrammetry_v1', implementationStatus: 'simulation', isAvailable: false },
  { name: 'dust3r', implementationStatus: 'scaffold', isAvailable: false },
] };
const scanFixture = (status = 'uploaded') => ({ id: 1n, patientId: 2n, dentistId: 3n, clinicId: null, modality: '3D_SCAN', status,
  folderName: 'SCAN-3D-controlled-test', updatedAt: new Date(), metadata: { storageVersion: 'private_v1', videoFileName: 'raw.mp4',
    checksum: 'a'.repeat(64), video: { decodeVerified: true, checksum: 'a'.repeat(64), fileName: 'raw.mp4' },
    processingJob: { jobId: 'test-job', status, attempts: 0, reconstructionEngine: 'opencv_sparse_sfm' } } });

function memoryStore(initial) {
  let row = structuredClone(initial);
  const audits = [];
  const matches = where => row && (!where.id || where.id === row.id) && (!where.status || where.status === row.status)
    && (!where.metadata || JSON.stringify(where.metadata.equals) === JSON.stringify(row.metadata));
  const store = { audits, get: () => structuredClone(row), set: value => { row = structuredClone(value); },
    imagingStudy: {
      findFirst: async ({ where }) => matches(where) ? structuredClone(row) : null,
      findMany: async ({ where }) => matches(where) ? [structuredClone(row)] : [],
      updateMany: async ({ where, data }) => { if (!matches(where)) return { count: 0 }; row = { ...row, ...structuredClone(data), updatedAt: new Date() }; return { count: 1 }; },
    }, securityEvent: { create: async ({ data }) => { audits.push(data); return data; } },
  };
  store.$transaction = async operation => operation(store);
  return store;
}
const realResult = { success: true, assets: { mesh: { fileName: 'mesh.obj', checksum: 'b'.repeat(64), vertexCount: 120, faceCount: 140 } },
  provenance: { geometrySource: 'image_derived', synthetic: false },
  metrics: { registeredFrames: 3, vertexCount: 120, faceCount: 140,
    geometryEvidence: { pointSource: 'dense_multiview_stereo', contributingViews: 3, denseStatus: 'executed',
      denseSupportedPoints: 120, meshFromDense: true, perToothCoverageStatus: 'observed_multiview_support_only' },
    denseMultiView: { minimumIndependentViewCount: 3, minimumSupportingPairCount: 2,
      supportArtifact: { sha256: 'c'.repeat(64) } },
    perToothSupport: { status: 'observed_multiview_support_only', missingExpectedTeeth: [],
      teeth: [{ fdi: 11, labelVerified: false, verticesInThreeOrMoreViews: 120,
        facesWithThreeViewVertexSupport: 140, anatomicalSurfaceCompleteness: null }] },
    meshTopology: { nonManifoldEdges: 0, inconsistentWindingEdges: 0,
      selfIntersections: { status: 'evaluated', count: 0 } },
    multiViewSparse: { bundleAdjustment: { status: 'executed' } } },
  lidra: { dentalEvidence: { status: 'operator_annotated_unverified' },
    qualityDecision: { status: 'accepted_for_experimental_geometry' } }, performance: {} };

test('queue rejects missing verified input, unknown engines, simulations and scaffolds', async () => {
  for (const engine of ['missing', 'photogrammetry_v1', 'dust3r']) {
    await assert.rejects(createScanQueue(memoryStore(scanFixture()), registry).enqueue(1n, { engine }), { code: 'ENGINE_UNAVAILABLE' });
  }
  const scan = scanFixture(); scan.metadata.video.decodeVerified = false;
  await assert.rejects(createScanQueue(memoryStore(scan), registry).enqueue(1n), { code: 'VIDEO_NOT_VERIFIED' });
});

test('queue rejects an unconfigured scan service before changing the scan state', async () => {
  const store = memoryStore(scanFixture());
  const token = process.env.SCAN3D_SERVICE_TOKEN;
  delete process.env.SCAN3D_SERVICE_TOKEN;
  try {
    await assert.rejects(createScanQueue(store, registry).enqueue(1n), {
      code: 'SCAN_SERVICE_NOT_CONFIGURED', status: 503,
    });
    assert.equal(store.get().status, 'uploaded');
    assert.equal(store.audits.length, 0);
  } finally {
    process.env.SCAN3D_SERVICE_TOKEN = token;
  }
});

test('queue accepts a verified video, ignores client retry inflation, and is idempotent', async () => {
  const store = memoryStore(scanFixture()); const queue = createScanQueue(store, registry);
  const queued = await queue.enqueue(1n, { maxAttempts: 999 });
  assert.equal(queued.job.maxAttempts, 3);
  assert.equal(queued.scan.status, 'queued');
  assert.equal((await queue.enqueue(1n)).idempotent, true);
  assert.equal(store.audits.length, 1);
});

test('failed jobs cannot bypass retry limits or backoff', async () => {
  const scan = scanFixture('failed'); scan.metadata.processingJob.attempts = MAX_SCAN_ATTEMPTS;
  await assert.rejects(createScanQueue(memoryStore(scan), registry).retry(1n, { maxAttempts: 100 }), { code: 'RETRY_LIMIT_REACHED' });
  scan.metadata.processingJob.attempts = 1;
  scan.metadata.processingJob.nextAttemptAt = new Date(Date.now() + 60000).toISOString();
  await assert.rejects(createScanQueue(memoryStore(scan), registry).retry(1n), { code: 'RETRY_BACKOFF' });
});

test('concurrent queue requests use compare-and-swap so only one transition wins', async () => {
  const store = memoryStore(scanFixture()); const queue = createScanQueue(store, registry);
  const results = await Promise.allSettled([queue.enqueue(1n), queue.enqueue(1n)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(store.audits.length, 1);
});

test('two workers cannot claim the same job or run a ready job again', async () => {
  const study = scanFixture('queued'); const store = memoryStore(study); let calls = 0;
  const worker = createScanWorker(store, async (_study, options) => {
    calls += 1; assert.match(options.outputDir, /attempts\/[a-f0-9-]+$/); assert(options.signal); return realResult;
  });
  const results = await Promise.all([worker.processStudy(study), worker.processStudy(study)]);
  assert.equal(calls, 1); assert.equal(results.filter(result => result.success).length, 1);
  assert.equal(store.get().status, 'ready');
  assert.equal(store.get().metadata.capabilities.measurementCapability, 'visualization_only');
  assert.equal((await worker.processStudy(store.get())).skipped, true);
  assert.deepEqual(store.audits.map(item => item.eventType), ['processing_started', 'reconstruction_completed']);
});

test('a stale worker cannot publish or overwrite the result of a newer lease', async () => {
  const store = memoryStore(scanFixture('queued')); let finish; let began;
  const started = new Promise(resolve => { began = resolve; });
  const worker = createScanWorker(store, async () => { began(); return new Promise(resolve => { finish = resolve; }); });
  const pending = worker.processStudy(store.get()); await started;
  const next = store.get(); next.metadata.processingJob.leaseToken = 'new-owner'; store.set(next);
  finish(realResult);
  const result = await pending;
  assert.equal(result.status, 'lease_lost'); assert.equal(store.get().status, 'processing');
  assert.equal(store.get().metadata.processingJob.leaseToken, 'new-owner'); assert.equal(store.get().metadata.assets, undefined);
});

test('crash recovery requeues expired leases with backoff and exhausts the fixed budget', async () => {
  for (const attempts of [1, 3]) {
    const scan = scanFixture('processing'); Object.assign(scan.metadata.processingJob, { attempts, leaseToken: 'dead', leaseExpiresAt: new Date(0).toISOString() });
    const store = memoryStore(scan); await createScanWorker(store).recoverExpired();
    assert.equal(store.get().status, attempts === 3 ? 'failed' : 'queued');
    assert.equal(store.get().metadata.processingJob.leaseToken, null);
    assert(Date.parse(store.get().metadata.processingJob.nextAttemptAt) > Date.now());
  }
});

test('worker rejects synthetic output and records no assets', async () => {
  const store = memoryStore(scanFixture('queued'));
  const result = await createScanWorker(store, async () => ({ ...realResult, provenance: { synthetic: true } })).processStudy(store.get());
  assert.equal(result.status, 'failed'); assert.equal(store.get().metadata.assets, null);
  assert.equal(store.get().metadata.processingJob.recoverable, false);
});

test('sparse two-view geometry fails closed, retains diagnostics, and is not retried with the same capture', async () => {
  const store = memoryStore(scanFixture('queued'));
  const sparse = { ...realResult,
    assets: { mesh: { ...realResult.assets.mesh, vertexCount: 86, faceCount: 94 } },
    metrics: { registeredFrames: 2, vertexCount: 86, faceCount: 94, sampledFrames: 18 } };
  const result = await createScanWorker(store, async () => sparse).processStudy(store.get());
  assert.equal(result.status, 'failed');
  assert.equal(store.get().metadata.assets, null);
  assert.equal(store.get().metadata.diagnosticAssets.mesh.fileName, 'mesh.obj');
  assert.equal(store.get().metadata.qualityAssessment.status, 'insufficient');
  assert(store.get().metadata.qualityAssessment.reasons.includes('TOO_FEW_REGISTERED_VIEWS'));
  assert.equal(store.get().metadata.processingJob.failureCode, GEOMETRY_INSUFFICIENT_CODE);
  assert.equal(store.get().metadata.processingJob.recoverable, false);
  assert.equal(store.get().metadata.metrics.sampledFrames, 18);
  const publicMetadata = publicScanMetadata(store.get().metadata);
  assert.equal(publicMetadata.qualityAssessment.registeredFrames, 2);
  assert(publicMetadata.qualityAssessment.reasons.includes('TOO_FEW_REGISTERED_VIEWS'));
  assert.equal(publicMetadata.assets, null);
  assert.equal(publicMetadata.diagnosticAssets, undefined);
  const diagnostic = publicScanState(store.get()).metadata.diagnosticMesh;
  assert.equal(diagnostic?.assetUrl, '/v1/x-core/3d-scans/1/diagnostic-mesh');
  assert.equal(diagnostic?.diagnosticOnly, true);
});

test('pre-gate ready sparse scan is reclassified on read and cannot expose assets', () => {
  const scan = scanFixture('ready');
  scan.metadata = { ...scan.metadata, assets: { mesh: { fileName: 'mesh.obj', checksum: 'b'.repeat(64), vertexCount: 86, faceCount: 94 } },
    metrics: { registeredFrames: 2, vertexCount: 86, faceCount: 94 },
    provenance: { geometrySource: 'image_derived', synthetic: false } };
  const presented = publicScanState(scan);
  assert.equal(scan.status, 'ready');
  assert.equal(presented.status, 'failed');
  assert.equal(presented.metadata.assets, null);
  assert.equal(presented.metadata.diagnosticMesh?.assetUrl, '/v1/x-core/3d-scans/1/diagnostic-mesh');
  assert.equal(presented.metadata.processingJob.failureCode, GEOMETRY_INSUFFICIENT_CODE);
  assert.equal(presented.metadata.processingJob.recoverable, false);
});

test('geometry gate is an engineering floor, never anatomical or clinical validation', () => {
  const candidate = assessScanGeometry(realResult);
  assert.equal(candidate.status, 'candidate');
  assert.equal(candidate.anatomicalCoverage, 'unavailable');
  assert.equal(candidate.validated, false);
  assert.equal(candidate.clinicallyValidated, false);
  const goodInitial = assessScanGeometry({ ...realResult, metrics: { ...realResult.metrics,
    multiViewSparse: { bundleAdjustment: { status: 'initial_solution_retained', evaluatedTracks: 80,
      initialMedianReprojectionPx: .6, initialRobustLoss: .5 } } } });
  assert.equal(goodInitial.status, 'candidate');
  const poorInitial = assessScanGeometry({ ...realResult, metrics: { ...realResult.metrics,
    multiViewSparse: { bundleAdjustment: { status: 'initial_solution_retained', evaluatedTracks: 80,
      initialMedianReprojectionPx: 1.8, initialRobustLoss: 1.3 } } } });
  assert(poorInitial.reasons.includes('BUNDLE_ADJUSTMENT_NOT_EXECUTED'));
  assert.equal(assessScanGeometry({ ...realResult, assets: { mesh: { ...realResult.assets.mesh, faceCount: 139 } } }).status, 'insufficient');
  assert.equal(assessScanGeometry({ ...realResult, metrics: {} }).status, 'insufficient');
  const bestPairOnly = assessScanGeometry({ ...realResult, metrics: { ...realResult.metrics,
    geometryEvidence: { pointSource: 'best_pair_sparse_triangulation', contributingViews: 2,
      denseStatus: 'not_executed', denseSupportedPoints: 0, meshFromDense: false } } });
  assert(bestPairOnly.reasons.includes('GEOMETRY_STILL_BEST_PAIR'));
  assert(bestPairOnly.reasons.includes('DENSE_MULTIVIEW_NOT_EXECUTED'));
  const noSupportFile = assessScanGeometry({ ...realResult, metrics: { ...realResult.metrics,
    denseMultiView: { ...realResult.metrics.denseMultiView, supportArtifact: null } } });
  assert(noSupportFile.reasons.includes('VERTEX_VIEW_SUPPORT_UNVERIFIED'));
  const missingTooth = assessScanGeometry({ ...realResult, metrics: { ...realResult.metrics,
    perToothSupport: { ...realResult.metrics.perToothSupport, missingExpectedTeeth: [11] } } });
  assert(missingTooth.reasons.includes('PER_TOOTH_OBSERVED_PATCH_UNAVAILABLE'));
  assert.equal(assessScanGeometry({ ...realResult, lidra: {} }).status, 'insufficient');
  const displayCapture = assessScanGeometry({ ...realResult, lidra: { ...realResult.lidra,
    captureTarget: { status: 'suspected_display_capture', confirmed: false } } });
  assert.equal(displayCapture.status, 'insufficient');
  assert(displayCapture.reasons.includes('CAPTURE_TARGET_SCREEN_SUSPECTED'));
});

test('current dental acquisition diagnostics remain visible after a failed candidate gate', () => {
  const state = publicScanMetadata({ ...realResult.metrics, provenance: realResult.provenance,
    lidra: { version: 'lidra_dental_evidence_v3', status: 'rejected', qualityScore: null,
      frameSelection: { selectedFramesCount: 12 }, qualityDecision: { status: 'rejected' } } });
  assert.equal(state.lidra.version, 'lidra_dental_evidence_v3');
  assert.equal(state.lidra.frameSelection.selectedFramesCount, 12);
  assert.equal(state.lidra.qualityScore, null);
  const current = publicScanMetadata({ provenance: realResult.provenance,
    lidra: { version: 'lidra_dental_evidence_v4', status: 'rejected', qualityScore: null,
      captureTarget: { status: 'suspected_display_capture' } } });
  assert.equal(current.lidra.captureTarget.status, 'suspected_display_capture');
});

test('worker permanently fails missing dependencies instead of retrying indefinitely', async () => {
  const store = memoryStore(scanFixture('queued'));
  await createScanWorker(store, async () => { throw Object.assign(new Error('private service detail'), { retryable: false, code: 'SCAN_SERVICE_NOT_CONFIGURED' }); }).processStudy(store.get());
  assert.equal(store.get().status, 'failed');
  assert.equal(store.get().metadata.processingJob.recoverable, false);
  assert(!store.get().metadata.processingJob.failureReason.includes('private service detail'));
  assert.match(store.get().metadata.processingJob.failureReason, /not configured/);
});

test('worker identifies capture rejection without disclosing internal errors', async () => {
  const store = memoryStore(scanFixture('queued'));
  await createScanWorker(store, async () => { throw Object.assign(new Error('private capture detail'), { retryable: false, code: 'CAPTURE_QUALITY_REJECTED' }); }).processStudy(store.get());
  assert.equal(store.get().status, 'failed');
  assert.equal(store.get().metadata.processingJob.failureCode, 'CAPTURE_QUALITY_REJECTED');
  assert.match(store.get().metadata.processingJob.failureReason, /new video/);
  assert(!store.get().metadata.processingJob.failureReason.includes('private capture detail'));
});

test('timeout aborts processing and schedules bounded backoff', async () => {
  const store = memoryStore(scanFixture('queued'));
  const result = await createScanWorker(store, async (_study, { signal }) => new Promise((_resolve, reject) => {
    const keepAlive = setTimeout(() => reject(new Error('test timeout')), 1000);
    signal.addEventListener('abort', () => { clearTimeout(keepAlive); reject(signal.reason); });
  }), { timeoutMs: 20, leaseMs: 1000 }).processStudy(store.get());
  assert.equal(result.status, 'queued'); assert.equal(store.get().metadata.processingJob.failureCode, 'RECONSTRUCTION_TIMEOUT');
  assert(Date.parse(store.get().metadata.processingJob.nextAttemptAt) > Date.now());
});

test('legacy synthetic metadata and uncalibrated confidence are not exposed as clinical assets', () => {
  const safe = publicScanMetadata({ assets: { mesh: { fileName: 'fake.obj' } }, confidence: 0.99, processingJob: { leaseToken: 'secret', logs: [{ message: '/private/server/path', stage: 'failure' }] } });
  assert.equal(safe.assets, null); assert.equal(safe.confidence, null); assert.equal(safe.capabilities.scaleValidated, false);
  assert.equal(safe.processingJob.leaseToken, undefined); assert.equal(safe.processingJob.logs[0].message, undefined);
});

test('client capture metadata cannot inject assets, job state, provenance or measured scale', () => {
  assert.deepEqual(clientScanMetadata({ device: { model: 'phone' }, assets: { mesh: 'bad' }, processingJob: {}, provenance: {}, scale: 'mm' }), { device: { model: 'phone' } });
  const where = associatedPatientWhere(3n);
  assert(where.OR.every(clause => Object.values(clause)[0].some.dentistId === 3n));
});

test('procedural tooth caches cannot become patient evidence', () => {
  assert.throws(() => assertRealSegmentation({ provenance: { engine: 'geometric_arch_heuristic_v1' }, instances: [{ fdi: 11, confidence: 0.85 }] }, '1'), { code: 'SEGMENTATION_UNAVAILABLE' });
});

test('scan public proxy guard rejects reconstruction routes and encoded scan-file bypasses', () => {
  for (const p of ['/reconstruct/3d-scan', '/lidra/analyze', '/segment/tooth-instances', '/assets/SCAN-3D-a/mesh.obj', '/assets/%2553CAN-3D-a/mesh.obj', '/assets/%2e%2e/private/mesh.obj']) assert.equal(isPrivateScanProxyPath(p), true, p);
  assert.equal(isPrivateScanProxyPath('/health'), false);
});

test('storage rejects traversal, symlink escapes, and unregistered assets', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'scan-storage-test-')); const inside = path.join(dir, 'study');
  try {
    await fs.mkdir(inside); await fs.writeFile(path.join(dir, 'outside.obj'), 'not patient data');
    await fs.symlink(path.join(dir, 'outside.obj'), path.join(inside, 'escape.obj'));
    assert.throws(() => safeComponent('../patient')); assert.throws(() => safeComponent('..\\patient'));
    await assert.rejects(confinedExistingFile(inside, '../outside.obj'));
    await assert.rejects(confinedExistingFile(inside, 'escape.obj'));
    assert.equal(registeredAsset({ assets: { mesh: { fileName: 'mesh.obj' } } }, 'mesh.obj'), null);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('server probe rejects unsupported and invalid duration/fps', () => {
  assert.throws(() => parseVideoProbe({ streams: [] }), { code: 'INVALID_VIDEO' });
  assert.throws(() => parseVideoProbe({ streams: [{ codec_type: 'video', codec_name: 'h264', duration: 181, width: 128, height: 128, avg_frame_rate: '30/1' }] }), { code: 'INVALID_VIDEO' });
});

test('real ffmpeg controlled fixture is decoded and measured; fake MP4 bytes are rejected', async t => {
  try { await execute(process.env.FFMPEG_PATH || 'ffmpeg', ['-version']); await execute(process.env.FFPROBE_PATH || 'ffprobe', ['-version']); }
  catch { return t.skip('ffmpeg/ffprobe unavailable: media integration not verified'); }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'scan-media-test-'));
  try {
    const video = path.join(dir, 'controlled-fixture.mp4');
    await execute(process.env.FFMPEG_PATH || 'ffmpeg', ['-nostdin', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=128x128:rate=12', '-t', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', video]);
    const result = await inspectVideo(video);
    assert.equal(result.width, 128); assert.equal(result.height, 128); assert.equal(result.fps, 12); assert.equal(result.durationMs, 1000);
    assert.equal(result.decodeVerified, true); assert.equal(result.checksum, await sha256File(video));
    await fs.writeFile(path.join(dir, 'fake.mp4'), 'mp4-continuous-rgb-video-payload-simulated-bytes');
    await assert.rejects(inspectVideo(path.join(dir, 'fake.mp4')), { code: 'INVALID_VIDEO' });
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('queue polling reaches runnable jobs beyond a page of delayed or exhausted jobs', async () => {
  const ready = scanFixture('queued'); ready.id = 101n;
  const store = memoryStore(ready);
  const deferred = Array.from({ length: 100 }, (_, index) => {
    const row = scanFixture('queued'); row.id = BigInt(index + 1);
    if (index % 2) row.metadata.processingJob.attempts = MAX_SCAN_ATTEMPTS;
    else row.metadata.processingJob.nextAttemptAt = new Date(Date.now() + 60000).toISOString();
    return row;
  });
  store.imagingStudy.findMany = async ({ where }) => where.status === 'processing' ? []
    : where.id?.gt === 100n ? [ready] : deferred;
  let calls = 0;
  const result = await createScanWorker(store, async () => { calls += 1; return realResult; }).tick();
  assert.equal(calls, 1); assert.equal(result.status, 'ready');
});
