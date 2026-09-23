import 'dotenv/config';
import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const {
  getScanPatients,
  createScanPatient,
  create3DScan,
  get3DScanDetails,
  upload3DScanVideo,
} = await import('../src/controllers/xCoreScanController.js');

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
  app.post('/v1/x-core/3d-scans', authMiddlewareMock, requireDentistMock, create3DScan);
  app.get('/v1/x-core/3d-scans/:id', authMiddlewareMock, requireDentistMock, get3DScanDetails);
  app.post('/v1/x-core/3d-scans/:id/video', authMiddlewareMock, requireDentistMock, upload.single('video'), upload3DScanVideo);

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
    assert.equal(scan.status, 'pending_capture');
    assert.equal(scan.scanScope, 'upper');
    assert.equal(scan.patientId, newPatientId);
    assert.equal(scan.dentistId, dentist.id.toString());
    assert(scan.createdAt);
    assert.equal(scan.patient.name, 'Ahmad Baru');

    // 5. Test GET /v1/x-core/3d-scans/:id
    const getScanRes = await httpJson(baseUrl, `/v1/x-core/3d-scans/${scan.id}`);
    assert.equal(getScanRes.status, 200);
    assert.equal(getScanRes.json.scan.scanIdentifier, scan.scanIdentifier);
    assert.equal(getScanRes.json.scan.status, 'pending_capture');
    assert.equal(getScanRes.json.scan.patient.name, 'Ahmad Baru');

    // 6. Test POST /v1/x-core/3d-scans/:id/video (Upload Raw Continuous Video)
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
    assert.equal(uploadJson.scan.status, 'captured');
    assert.equal(uploadJson.scan.video.fileName, 'raw_video.mp4');
    assert.equal(uploadJson.scan.video.durationMs, 32500);
    assert.equal(uploadJson.scan.video.resolution, '1080p');
    assert.equal(uploadJson.scan.video.fps, 30);
    assert(uploadJson.scan.video.sizeInBytes > 0);
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
