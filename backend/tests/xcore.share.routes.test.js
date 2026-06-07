import 'dotenv/config';
import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const {
  createStudyShare,
  getSharedStudy,
  validateStudyShareToken
} = await import('../src/controllers/xCoreController.js');

let authUserId = null;

function createApp() {
  const app = express();
  app.use(express.json());
  app.post('/v1/x-core/studies/:id/share', (req, res, next) => {
    req.user = { id: String(authUserId) };
    next();
  }, createStudyShare);
  app.get('/v1/x-core/share/:token', getSharedStudy);
  app.get('/v1/x-core/share/:token/validate', validateStudyShareToken);
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
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  return {
    status: response.status,
    json: text ? JSON.parse(text) : {}
  };
}

async function cleanupFixtures() {
  const studies = await prisma.imagingStudy.findMany({
    where: { folderName: { startsWith: 'share-test-' } },
    select: { id: true }
  });
  const studyIds = studies.map((study) => study.id);
  if (studyIds.length > 0) {
    await prisma.studyShare.deleteMany({ where: { studyId: { in: studyIds } } });
    await prisma.imagingStudy.deleteMany({ where: { id: { in: studyIds } } });
  }
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'xcore-share-dentist@test.local',
          'xcore-share-patient@test.local'
        ]
      }
    }
  });
}

async function createFixtureStudy() {
  const dentist = await prisma.user.create({
    data: {
      name: 'Dr Share',
      email: 'xcore-share-dentist@test.local',
      password_hash: 'hash',
      roles: ['dentist']
    }
  });
  const patient = await prisma.user.create({
    data: {
      name: 'Patient Share',
      email: 'xcore-share-patient@test.local',
      password_hash: 'hash',
      roles: ['patient']
    }
  });
  const study = await prisma.imagingStudy.create({
    data: {
      patientId: patient.id,
      dentistId: dentist.id,
      studyDate: new Date('2026-01-15T00:00:00.000Z'),
      modality: 'CBCT',
      folderName: `share-test-${Date.now()}`,
      originalName: 'Uploaded CBCT',
      status: 'processed',
      metadata: {
        PatientName: 'Sanitized^Patient',
        StudyDescription: 'Implant planning CBCT'
      },
      sizeInBytes: 0n
    }
  });

  authUserId = dentist.id;
  return { dentist, patient, study };
}

beforeEach(async () => {
  await cleanupFixtures();
});

after(async () => {
  await cleanupFixtures();
  await prisma.$disconnect();
});

test('POST /v1/x-core/studies/:id/share rejects public link creation without a recipient dentist', async () => {
  const { study } = await createFixtureStudy();

  await withServer(async (baseUrl) => {
    const response = await httpJson(baseUrl, `/v1/x-core/studies/${study.id}/share`, {
      method: 'POST',
      body: JSON.stringify({ expiresInHours: 48 })
    });

    assert.equal(response.status, 400);
    assert.match(response.json.error, /recipientDentistId/);

    const stored = await prisma.studyShare.findFirst({ where: { studyId: study.id } });
    assert.equal(stored, null);
  });
});

test('public X-Core share token endpoints are disabled', async () => {
  await withServer(async (baseUrl) => {
    const view = await httpJson(baseUrl, '/v1/x-core/share/legacy-token');
    const validate = await httpJson(baseUrl, '/v1/x-core/share/legacy-token/validate');

    assert.equal(view.status, 410);
    assert.equal(validate.status, 410);
    assert.match(view.json.error, /disabled/);
    assert.match(validate.json.error, /disabled/);
  });
});
