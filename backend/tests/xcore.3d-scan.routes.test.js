import 'dotenv/config';
import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';

import fs from 'node:fs';
import path from 'node:path';
const prisma = new PrismaClient();
const {
  getScanPatients,
  createScanPatient,
  create3DScan,
  get3DScanDetails,
  upload3DScanVideo,
  enqueue3DScan,
  get3DScanStatus,
  retry3DScan,
  get3DScanAsset,
  get3DScanEngines,
  get3DScanLidraReport,
  get3DScanToothInstances,
  trigger3DScanSegmentation,
} = await import('../src/controllers/xCoreScanController.js');

const { processScanNow } = await import('../src/services/scan3D/scan3DWorker.js');

let authUser = null;

function createApp() {
  const app = express();
  app.use(express.json());
  const upload = multer({ storage: multer.memoryStorage() });

  const authMiddlewareMock = (req, res, next) => {
    if (!authUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    req.user = authUser;
    next();
  };

  const requireDentistMock = (req, res, next) => {
    if (!req.user?.roles?.includes('dentist')) {
      return res.status(403).json({ error: 'Forbidden: Dentist role required' });
    }
    next();
  };

  app.get('/v1/x-core/3d-scans/patients', authMiddlewareMock, requireDentistMock, getScanPatients);
  app.post('/v1/x-core/3d-scans/patients', authMiddlewareMock, requireDentistMock, createScanPatient);
  app.get('/v1/x-core/3d-scans/engines', authMiddlewareMock, requireDentistMock, get3DScanEngines);
  app.post('/v1/x-core/3d-scans', authMiddlewareMock, requireDentistMock, create3DScan);
  app.get('/v1/x-core/3d-scans/:id', authMiddlewareMock, requireDentistMock, get3DScanDetails);
  app.get('/v1/x-core/3d-scans/:id/lidra', authMiddlewareMock, requireDentistMock, get3DScanLidraReport);
  app.post('/v1/x-core/3d-scans/:id/video', authMiddlewareMock, requireDentistMock, upload.single('video'), upload3DScanVideo);
  app.post('/v1/x-core/3d-scans/:id/queue', authMiddlewareMock, requireDentistMock, enqueue3DScan);
  app.get('/v1/x-core/3d-scans/:id/status', authMiddlewareMock, requireDentistMock, get3DScanStatus);
  app.post('/v1/x-core/3d-scans/:id/retry', authMiddlewareMock, requireDentistMock, retry3DScan);
  app.get('/v1/x-core/3d-scans/:id/assets/:fileName', authMiddlewareMock, requireDentistMock, get3DScanAsset);
  app.get('/v1/x-core/3d-scans/:id/tooth-instances', authMiddlewareMock, requireDentistMock, get3DScanToothInstances);
  app.post('/v1/x-core/3d-scans/:id/tooth-instances/segment', authMiddlewareMock, requireDentistMock, trigger3DScanSegmentation);

  return app;
}

async function withServer(run) {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function httpJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  return {
    status: response.status,
    json: text ? JSON.parse(text) : {},
  };
}

async function cleanupFixtures() {
  const studies = await prisma.imagingStudy.findMany({
    where: { folderName: { startsWith: 'SCAN-3D-' } },
    select: { id: true },
  });
  const studyIds = studies.map((s) => s.id);
  if (studyIds.length > 0) {
    await prisma.imagingStudyPatientAssignment.deleteMany({ where: { studyId: { in: studyIds } } });
    await prisma.imagingStudy.deleteMany({ where: { id: { in: studyIds } } });
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'test-dentist-scan@test.local',
          'test-patient-scan@test.local',
          'test-created-patient@test.local',
        ],
      },
    },
  });
}

beforeEach(async () => {
  await cleanupFixtures();
});

after(async () => {
  await cleanupFixtures();
  await prisma.$disconnect();
});

test('3D Scan Workflow: Dentist can create patient specifically for 3D scan and initiate scan session', async () => {
  // 1. Create fixture dentist and existing patient
  const dentist = await prisma.user.create({
    data: {
      name: 'drg. Maya Scan',
      email: 'test-dentist-scan@test.local',
      password_hash: 'hash',
      roles: ['dentist'],
    },
  });

  const patient = await prisma.user.create({
    data: {
      name: 'Budi Santoso',
      email: 'test-patient-scan@test.local',
      password_hash: 'hash',
      phone_number: '+628123456789',
      roles: ['patient'],
    },
  });

  // Link patient to dentist via appointment so patient shows in dentist list
  await prisma.appointment.create({
    data: {
      dentistId: dentist.id,
      patientId: patient.id,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 60 * 1000),
      status: 'confirmed',
    },
  });

  authUser = {
    id: dentist.id.toString(),
    roles: ['dentist'],
  };

  await withServer(async (baseUrl) => {
    // 2. Test GET /v1/x-core/3d-scans/patients
    const listRes = await httpJson(baseUrl, '/v1/x-core/3d-scans/patients');
    assert.equal(listRes.status, 200);
    assert(Array.isArray(listRes.json.patients));
    assert(listRes.json.patients.some((p) => p.name === 'Budi Santoso'));

    // 3. Test POST /v1/x-core/3d-scans/patients (Create Patient for Scan)
    // Validation check: name required
    const invalidRes1 = await httpJson(baseUrl, '/v1/x-core/3d-scans/patients', {
      method: 'POST',
      body: JSON.stringify({ phone: '+62899887766' }),
    });
    assert.equal(invalidRes1.status, 400);
    assert.equal(invalidRes1.json.code, 'PATIENT_NAME_REQUIRED');

    // Successful patient creation
    const createPatientRes = await httpJson(baseUrl, '/v1/x-core/3d-scans/patients', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Ahmad Baru',
        phone: '081299887766',
        email: 'test-created-patient@test.local',
        gender: 'male',
      }),
    });
    assert.equal(createPatientRes.status, 201);
    assert(createPatientRes.json.patient);
    assert.equal(createPatientRes.json.patient.name, 'Ahmad Baru');
    assert.equal(createPatientRes.json.patient.phone, '+6281299887766');
    const newPatientId = createPatientRes.json.patient.id;

    // 4. Test POST /v1/x-core/3d-scans (Initiate 3D Scan Session)
    // Validation check: patientId required
    const invalidScanRes = await httpJson(baseUrl, '/v1/x-core/3d-scans', {
      method: 'POST',
      body: JSON.stringify({ scanScope: 'full' }),
    });
    assert.equal(invalidScanRes.status, 400);

    // Valid scan creation
    const createScanRes = await httpJson(baseUrl, '/v1/x-core/3d-scans', {
      method: 'POST',
      body: JSON.stringify({
        patientId: newPatientId,
        scanScope: 'upper',
        notes: 'Implant evaluation',
      }),
    });
    assert.equal(createScanRes.status, 201);
    const scan = createScanRes.json.scan;
    assert(scan);
    assert(scan.id);
    assert(scan.scanIdentifier.startsWith('SCAN-3D-'));
    assert.equal(scan.status, 'created');
    assert.equal(scan.scanScope, 'upper');
    assert.equal(scan.patientId, newPatientId);
    assert.equal(scan.dentistId, dentist.id.toString());
    assert(scan.createdAt);
    assert.equal(scan.patient.name, 'Ahmad Baru');

    // 5. Test GET /v1/x-core/3d-scans/:id
    const getScanRes = await httpJson(baseUrl, `/v1/x-core/3d-scans/${scan.id}`);
    assert.equal(getScanRes.status, 200);
    assert.equal(getScanRes.json.scan.scanIdentifier, scan.scanIdentifier);
    assert.equal(getScanRes.json.scan.status, 'created');
    assert.equal(getScanRes.json.scan.patient.name, 'Ahmad Baru');

    // 6. Test POST /v1/x-core/3d-scans/:id/video (Upload Raw Continuous Video - Non-blocking)
    const formData = new FormData();
    const fakeVideoBlob = new Blob(['mp4-continuous-rgb-video-payload-simulated-bytes'], {
      type: 'video/mp4',
    });
    formData.append('video', fakeVideoBlob, 'continuous_scan_rgb.mp4');
    formData.append('durationMs', '32500');
    formData.append('resolution', '1080p');
    formData.append('fps', '30');

    const uploadRes = await fetch(`${baseUrl}/v1/x-core/3d-scans/${scan.id}/video`, {
      method: 'POST',
      body: formData,
    });
    const uploadJson = await uploadRes.json();
    assert.equal(uploadRes.status, 200);
    assert.equal(uploadJson.success, true);
    assert.equal(uploadJson.scan.status, 'uploaded');
    assert.equal(uploadJson.scan.video.fileName, 'raw_video.mp4');
    assert.equal(uploadJson.scan.video.durationMs, 32500);
    assert.equal(uploadJson.scan.video.resolution, '1080p');
    assert.equal(uploadJson.scan.video.fps, 30);
    assert(uploadJson.scan.video.sizeInBytes > 0);
    assert(uploadJson.scan.video.checksum);

    // 7. Test POST /v1/x-core/3d-scans/:id/queue (Asynchronous Queueing)
    const queueRes = await httpJson(baseUrl, `/v1/x-core/3d-scans/${scan.id}/queue`, {
      method: 'POST',
      body: JSON.stringify({ engine: 'photogrammetry_v1' }),
    });
    assert.equal(queueRes.status, 200);
    assert.equal(queueRes.json.success, true);
    assert.equal(queueRes.json.scan.status, 'queued');
    assert.equal(queueRes.json.job.status, 'queued');

    // 8. Test GET /v1/x-core/3d-scans/:id/status (Polling Queued State)
    const queuedStatusRes = await httpJson(baseUrl, `/v1/x-core/3d-scans/${scan.id}/status`);
    assert.equal(queuedStatusRes.status, 200);
    assert.equal(queuedStatusRes.json.status, 'queued');
    assert.equal(queuedStatusRes.json.progressPercent, 5);

    // 9. Execute Worker Processing
    const workerResult = await processScanNow(scan.id);
    assert.equal(workerResult.success, true);
    assert.equal(workerResult.status, 'ready');

    // 10. Test GET /v1/x-core/3d-scans/:id/status (Polling Ready State)
    const readyStatusRes = await httpJson(baseUrl, `/v1/x-core/3d-scans/${scan.id}/status`);
    assert.equal(readyStatusRes.status, 200);
    assert.equal(readyStatusRes.json.status, 'ready');
    assert.equal(readyStatusRes.json.progressPercent, 100);
    assert(readyStatusRes.json.assets);
    assert(readyStatusRes.json.assets.mesh);
    assert.equal(readyStatusRes.json.assets.mesh.fileName, 'mesh.obj');
    assert(readyStatusRes.json.assets.preview);
    assert.equal(readyStatusRes.json.assets.preview.fileName, 'preview.png');
    assert(readyStatusRes.json.lidra);
    assert(readyStatusRes.json.lidra.qualityScore > 0);
    assert(readyStatusRes.json.confidence >= 0.5);
    assert(Array.isArray(readyStatusRes.json.cameraTrajectory));

    // 11. Test Phase 6: GET /v1/x-core/3d-scans/:id/lidra (LIDRA Report)
    const lidraRes = await httpJson(baseUrl, `/v1/x-core/3d-scans/${scan.id}/lidra`);
    assert.equal(lidraRes.status, 200);
    assert.equal(lidraRes.json.success, true);
    assert(lidraRes.json.lidra);
    assert(lidraRes.json.lidra.qualityScore > 0);
    assert(lidraRes.json.lidra.motionBlur);
    assert(lidraRes.json.lidra.coverage);

    // 12. Test Phase 7: GET /v1/x-core/3d-scans/engines (Reconstruction Engines List)
    const enginesRes = await httpJson(baseUrl, '/v1/x-core/3d-scans/engines');
    assert.equal(enginesRes.status, 200);
    assert.equal(enginesRes.json.success, true);
    assert.equal(enginesRes.json.defaultEngine, 'photogrammetry_v1');
    assert(Array.isArray(enginesRes.json.engines));
    const engineNames = enginesRes.json.engines.map((e) => e.name);
    assert(engineNames.includes('photogrammetry_v1'));
    assert(engineNames.includes('colmap'));
    assert(engineNames.includes('dust3r'));
    assert(engineNames.includes('mast3r'));
    assert(engineNames.includes('neuralangelo'));
    assert(engineNames.includes('abot_recon'));

    // 13. Test GET /v1/x-core/3d-scans/:id/assets/:fileName (Download Generated Assets)
    const meshRes = await fetch(`${baseUrl}/v1/x-core/3d-scans/${scan.id}/assets/mesh.obj`);
    assert.equal(meshRes.status, 200);
    assert(meshRes.headers.get('content-type').includes('model/obj'));
    const meshContent = await meshRes.text();
    assert(meshContent.includes('v '));
    assert(meshContent.includes('f '));

    // Phase 8 & 9: Test mesh.stl binary asset
    const stlRes = await fetch(`${baseUrl}/v1/x-core/3d-scans/${scan.id}/assets/mesh.stl`);
    assert.equal(stlRes.status, 200);
    assert(stlRes.headers.get('content-type').includes('model/stl'));
    const stlBuf = Buffer.from(await stlRes.arrayBuffer());
    assert(stlBuf.length >= 84); // 80-byte header + 4-byte triangle count

    // Phase 8 & 9: Verify reconstruction report and dental filtering metadata
    const reportRes = await fetch(`${baseUrl}/v1/x-core/3d-scans/${scan.id}/assets/reconstruction_report.json`);
    assert.equal(reportRes.status, 200);
    const reportJson = await reportRes.json();
    assert.equal(reportJson.reconstructionStatus, 'ready');
    assert.deepEqual(reportJson.outputFormats, ['obj', 'ply', 'stl']);
    assert(reportJson.inputFrameCount !== undefined);
    assert(reportJson.dentalFiltering);
    assert(reportJson.dentalFiltering.dentalArchFit);
    assert(reportJson.dentalFiltering.prunedOutliersCount !== undefined);
    assert(reportJson.dentalFiltering.researchDisclaimer);

    const previewRes = await fetch(`${baseUrl}/v1/x-core/3d-scans/${scan.id}/assets/preview.png`);
    assert.equal(previewRes.status, 200);
    assert(previewRes.headers.get('content-type').includes('image/png'));

    // 12. Test Security: Reject unauthorized/disallowed file access
    const badExtRes = await fetch(`${baseUrl}/v1/x-core/3d-scans/${scan.id}/assets/exploit.exe`);
    assert.equal(badExtRes.status, 400);

    // Phase 12: Tooth Segmentation & FDI instances
    const folderName = scan.scanIdentifier || scan.folderName || `SCAN-3D-${scan.id}`;
    const uploadDir = path.join(process.cwd(), 'uploads/x-core', folderName);
    fs.mkdirSync(uploadDir, { recursive: true });
    const mockToothInstances = {
      provenance: {
        scanId: scan.id.toString(),
        engine: 'geometric_arch_heuristic_v1',
        experimental: true,
        diagnosticUseAllowed: false,
      },
      count: 2,
      instances: [
        {
          toothId: 'tooth-11',
          fdi: 11,
          quadrant: 1,
          name: 'Maxillary Right Central Incisor',
          confidence: 0.85,
          type: 'incisor',
          centroid: [2.5, 12.0, 1.0],
        },
        {
          toothId: 'tooth-21',
          fdi: 21,
          quadrant: 2,
          name: 'Maxillary Left Central Incisor',
          confidence: 0.85,
          type: 'incisor',
          centroid: [-2.5, 12.0, 1.0],
        },
      ],
    };
    fs.writeFileSync(path.join(uploadDir, 'tooth_instances.json'), JSON.stringify(mockToothInstances));

    const teethRes = await httpJson(baseUrl, `/v1/x-core/3d-scans/${scan.id}/tooth-instances`);
    assert.equal(teethRes.status, 200);
    assert.equal(teethRes.json.success, true);
    assert.equal(teethRes.json.count, 2);
    assert.equal(teethRes.json.instances[0].fdi, 11);
    assert.equal(teethRes.json.provenance.experimental, true);
    assert.equal(teethRes.json.provenance.diagnosticUseAllowed, false);

    // Test POST trigger tooth segmentation (returns 202 accepted)
    const segTriggerRes = await httpJson(baseUrl, `/v1/x-core/3d-scans/${scan.id}/tooth-instances/segment`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert.equal(segTriggerRes.status, 202);
    assert.equal(segTriggerRes.json.success, true);
    assert.equal(segTriggerRes.json.scanId, scan.id.toString());

    // 13. Test POST /v1/x-core/3d-scans/:id/retry (Retry Workflow)
    // First simulate failure
    await prisma.imagingStudy.update({
      where: { id: BigInt(scan.id) },
      data: {
        status: 'failed',
        metadata: {
          failureReason: 'Simulated pipeline failure for testing retry',
          processingJob: {
            status: 'failed',
            attempts: 1,
            maxAttempts: 3,
            currentStage: 'failed',
          },
        },
      },
    });

    const retryRes = await httpJson(baseUrl, `/v1/x-core/3d-scans/${scan.id}/retry`, {
      method: 'POST',
      body: JSON.stringify({ engine: 'photogrammetry_v1' }),
    });
    assert.equal(retryRes.status, 200);
    assert.equal(retryRes.json.success, true);
    assert.equal(retryRes.json.scan.status, 'queued');
    assert.equal(retryRes.json.job.status, 'queued');
  });

  // Clean up fixture appointment
  await prisma.appointment.deleteMany({ where: { dentistId: dentist.id } });
});

test('3D Scan Workflow: Non-dentist or unauthenticated user is rejected', async () => {
  await withServer(async (baseUrl) => {
    // Unauthenticated
    authUser = null;
    const unauthRes = await httpJson(baseUrl, '/v1/x-core/3d-scans/patients');
    assert.equal(unauthRes.status, 401);

    const unauthVideoRes = await fetch(`${baseUrl}/v1/x-core/3d-scans/1/video`, {
      method: 'POST',
    });
    assert.equal(unauthVideoRes.status, 401);

    // Patient role rejected from dentist scan endpoint
    authUser = { id: '999', roles: ['patient'] };
    const forbiddenRes = await httpJson(baseUrl, '/v1/x-core/3d-scans/patients');
    assert.equal(forbiddenRes.status, 403);
  });
});
