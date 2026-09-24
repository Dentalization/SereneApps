// These integration tests require an explicit isolated database. Never delete application scans.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);

const testUrl = process.env.SCAN3D_TEST_DATABASE_URL;
const isolated = testUrl && /(?:^|[_-])test(?:[_-]|$)/i.test(new URL(testUrl).pathname.slice(1));
if (testUrl && !isolated) throw new Error('SCAN3D_TEST_DATABASE_URL must name a dedicated test database');
if (isolated) process.env.DATABASE_URL = testUrl;
const controller = await import('../src/controllers/xCoreScanController.js');
const { createScanWorker } = await import('../src/services/scan3D/scan3DWorker.js');
const { privateScanDirectory, sha256File } = await import('../src/services/scan3D/scanStorage.js');
let authUser;
function app() {
  const app = express(); app.use(express.json());
  app.use((req, res, next) => {
    if (!authUser) return res.status(401).json({ error: 'Authentication required' });
    if (!authUser.roles?.includes('dentist')) return res.status(403).json({ error: 'Dentist required' });
    req.user = authUser; next();
  });
  app.get('/patients', controller.getScanPatients);
  app.post('/patients', controller.createScanPatient);
  app.post('/scans', controller.create3DScan);
  app.get('/scans/:id', controller.get3DScanDetails);
  app.post('/scans/:id/video', controller.authorize3DScanUpload, multer({ storage: multer.memoryStorage() }).single('video'), controller.upload3DScanVideo);
  app.post('/scans/:id/queue', controller.enqueue3DScan);
  app.get('/scans/:id/assets/:fileName', controller.get3DScanAsset);
  app.get('/scans/:id/tooth-instances', controller.get3DScanToothInstances);
  app.post('/scans/:id/tooth-instances/segment', controller.trigger3DScanSegmentation);
  return app;
}
async function withServer(run) {
  const server = await new Promise(resolve => { const instance = app().listen(0, '127.0.0.1', () => resolve(instance)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (route, body) => {
    const response = await fetch(`${base}${route}`, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, json: await response.json() };
  };
  try { await run(base, request); } finally { await new Promise(resolve => server.close(resolve)); }
}

test('3D scan routes require authenticated dentist role', async () => {
  await withServer(async (_base, request) => {
    authUser = null; assert.equal((await request('/patients')).status, 401);
    authUser = { id: '1', roles: ['patient'] }; assert.equal((await request('/patients')).status, 403);
  });
});

test('isolated DB: patient ownership, duplicate reuse, upload inspection and fail-closed routes', { skip: !isolated ? 'Set SCAN3D_TEST_DATABASE_URL to a dedicated test database; application data is never touched' : false }, async () => {
  const prisma = new PrismaClient(); const suffix = randomUUID(); const userIds = []; const scanFolders = [];
  const fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scan-route-test-'));
  try {
    const owner = await prisma.user.create({ data: { name: 'Controlled test dentist', email: `scan-owner-${suffix}@test.local`, password_hash: 'test-only', roles: ['dentist'] } }); userIds.push(owner.id);
    const other = await prisma.user.create({ data: { name: 'Unrelated test dentist', email: `scan-other-${suffix}@test.local`, password_hash: 'test-only', roles: ['dentist'] } }); userIds.push(other.id);
    const outside = await prisma.user.create({ data: { name: 'Unrelated test patient', email: `scan-outside-${suffix}@test.local`, password_hash: 'test-only', roles: ['patient'] } }); userIds.push(outside.id);
    authUser = { id: owner.id.toString(), roles: ['dentist'] };
    await withServer(async (base, request) => {
      assert.deepEqual((await request('/patients')).json.patients, []);
      assert.deepEqual((await request('/patients?search=Unrelated')).json.patients, []);
      assert.equal((await request('/scans', { patientId: String(outside.id) })).status, 404);
      const identity = { name: 'Controlled test patient', email: `scan-patient-${suffix}@test.local` };
      const created = await request('/patients', identity); assert.equal(created.status, 201); userIds.push(BigInt(created.json.patient.id));
      const reused = await request('/patients', identity); assert.equal(reused.json.patient.id, created.json.patient.id);
      const scansBefore = await prisma.imagingStudy.count({ where: { dentistId: owner.id, modality: '3D_SCAN' } }); assert.equal(scansBefore, 1);
      const scanResponse = await request('/scans', { patientId: created.json.patient.id, scanScope: 'upper', metadata: { assets: { mesh: 'injected' }, provenance: { synthetic: false } } });
      assert.equal(scanResponse.status, 201); const scan = scanResponse.json.scan; scanFolders.push(scan.scanIdentifier);
      assert.equal(scan.assets, null); assert.equal(scan.capabilities.measurementCapability, 'visualization_only');
      assert.equal(await prisma.imagingStudy.count({ where: { dentistId: owner.id, modality: '3D_SCAN' } }), 1);
      assert.equal((await request(`/scans/${scan.id}/queue`, {})).status, 409);
      const fake = new FormData(); fake.append('video', new Blob(['fake-mp4-bytes'], { type: 'video/mp4' }), 'video.mp4');
      assert.equal((await fetch(`${base}/scans/${scan.id}/video`, { method: 'POST', body: fake })).status, 422);
      const videoPath = path.join(fixtureDir, 'controlled-fixture.mp4');
      await execute('ffmpeg', ['-nostdin', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=128x128:rate=12', '-t', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', videoPath]);
      const form = new FormData(); form.append('video', new Blob([await fs.readFile(videoPath)], { type: 'video/mp4' }), '../../unsafe.mp4');
      form.append('durationMs', '999999'); form.append('fps', '999'); form.append('resolution', '4K');
      const uploaded = await fetch(`${base}/scans/${scan.id}/video`, { method: 'POST', body: form }); const uploadedBody = await uploaded.json();
      assert.equal(uploaded.status, 200); assert.equal(uploadedBody.scan.video.durationMs, 1000); assert.equal(uploadedBody.scan.video.fps, 12);
      assert.equal(uploadedBody.scan.video.resolution, '128x128'); assert.match(uploadedBody.scan.video.fileName, /^raw_[a-f0-9-]+\.mp4$/);
      assert.equal((await request(`/scans/${scan.id}/assets/mesh.obj`)).status, 404);
      assert.equal((await request(`/scans/${scan.id}/tooth-instances`)).status, 503);
      assert.equal((await request(`/scans/${scan.id}/tooth-instances/segment`, {})).status, 503);
      assert.equal((await request(`/scans/${scan.id}/queue`, { engine: 'photogrammetry_v1' })).status, 422);
      const queued = await request(`/scans/${scan.id}/queue`, {}); assert.equal(queued.status, 200); assert.equal(queued.json.scan.status, 'queued');
      assert.equal(queued.json.job.leaseToken, undefined);
      // This is a mocked engine result for transaction/asset authorization testing only.
      // It is never submitted to geometry validation or claimed as a real reconstruction.
      let engineCalls = 0;
      const worker = createScanWorker(prisma, async (_study, { outputDir }) => {
        engineCalls += 1;
        await fs.mkdir(outputDir, { recursive: true });
        const file = path.join(outputDir, 'mesh.obj');
        await fs.writeFile(file, '# controlled test fixture, not patient geometry\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n');
        return { success: true, assets: { mesh: { fileName: 'mesh.obj', storagePath: path.relative(privateScanDirectory(_study), file), checksum: await sha256File(file) } },
          provenance: { geometrySource: 'image_derived', synthetic: false, testFixture: true }, metrics: {}, lidra: {}, performance: {} };
      });
      const queuedStudy = await prisma.imagingStudy.findUnique({ where: { id: BigInt(scan.id) } });
      const processed = await Promise.all([worker.processStudy(queuedStudy), worker.processStudy(queuedStudy)]);
      assert.equal(engineCalls, 1); assert.equal(processed.filter(result => result.success).length, 1);
      const downloaded = await fetch(`${base}/scans/${scan.id}/assets/mesh.obj`);
      assert.equal(downloaded.status, 200); assert.equal(downloaded.headers.get('cache-control'), 'private, no-store');
      assert.match(await downloaded.text(), /controlled test fixture/);
      const readyStudy = await prisma.imagingStudy.findUnique({ where: { id: BigInt(scan.id) } });
      await fs.appendFile(path.join(privateScanDirectory(readyStudy), readyStudy.metadata.assets.mesh.storagePath), '# corruption');
      assert.equal((await request(`/scans/${scan.id}/assets/mesh.obj`)).status, 409);
      authUser = { id: String(other.id), roles: ['dentist'] };
      assert.equal((await request(`/scans/${scan.id}`)).status, 404);
      assert.equal((await request('/patients', identity)).status, 409);
      assert.equal((await request(`/scans/${scan.id}/queue`, {})).status, 404);
      assert.equal((await fetch(`${base}/scans/${scan.id}/video`, { method: 'POST' })).status, 404);
      await prisma.studyDentistShare.create({ data: { studyId: BigInt(scan.id), ownerDentistId: owner.id, recipientDentistId: other.id, createdById: owner.id } });
      assert.equal((await request(`/scans/${scan.id}`)).status, 404, 'Sharing does not override current clinic isolation');
      assert.equal((await request(`/scans/${scan.id}/queue`, {})).status, 404, 'Shared access never permits mutation');
    });
  } finally {
    // Only records created by this test invocation are eligible for cleanup.
    const studies = await prisma.imagingStudy.findMany({ where: { dentistId: { in: userIds } }, select: { id: true, folderName: true } });
    await prisma.imagingStudyPatientAssignment.deleteMany({ where: { studyId: { in: studies.map(item => item.id) } } });
    await prisma.imagingStudy.deleteMany({ where: { id: { in: studies.map(item => item.id) } } });
    await prisma.securityEvent.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    for (const study of studies) await fs.rm(privateScanDirectory(study), { recursive: true, force: true });
    await fs.rm(fixtureDir, { recursive: true, force: true });
    await prisma.$disconnect();
  }
});
