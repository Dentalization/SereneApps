import 'dotenv/config';
import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

process.env.SHARE_SECRET = process.env.SHARE_SECRET || 'xcore-share-test-secret';
process.env.XCORE_SHARE_BASE_URL = 'https://viewer.test';
process.env.XCORE_PY_API_BASE_URL = 'http://python.test';

const prisma = new PrismaClient();
const nativeFetch = globalThis.fetch;
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
  const response = await nativeFetch(`${baseUrl}${path}`, {
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
  globalThis.fetch = async (url) => {
    if (String(url).startsWith('http://python.test/gallery/')) {
      return new Response(JSON.stringify({
        series: [
          {
            series_uid: '1.2.840.10008',
            title: 'CBCT Volume',
            type: '3D Volume',
            classification: '3D',
            modality: 'CT',
            num_slices: 240,
            status: 'ready',
            has_vti: true,
            has_image: false,
            has_thumb: true,
            has_labels: true,
            num_labels: 12,
            segmentation_method: 'heuristic_v2',
            segmentation_status: 'ready'
          }
        ]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return nativeFetch(url);
  };
  await cleanupFixtures();
});

after(async () => {
  globalThis.fetch = nativeFetch;
  await cleanupFixtures();
  await prisma.$disconnect();
});

test('POST /v1/x-core/studies/:id/share creates a signed share link', async () => {
  const { study } = await createFixtureStudy();

  await withServer(async (baseUrl) => {
    const response = await httpJson(baseUrl, `/v1/x-core/studies/${study.id}/share`, {
      method: 'POST',
      body: JSON.stringify({ expiresInHours: 48 })
    });

    assert.equal(response.status, 200);
    assert.ok(response.json.token);
    assert.match(response.json.shareUrl, /^https:\/\/viewer\.test\/shared\//);
    assert.ok(response.json.expiresAt);

    const stored = await prisma.studyShare.findUnique({ where: { token: response.json.token } });
    assert.ok(stored);
    assert.equal(stored.studyId, study.id);
  });
});

test('GET /v1/x-core/share/:token returns sanitized shared study with segmentation fields', async () => {
  const { study } = await createFixtureStudy();
  const token = jwt.sign(
    { studyId: study.id.toString(), folderId: study.folderName },
    process.env.SHARE_SECRET,
    { expiresIn: '24h' }
  );
  await prisma.studyShare.create({
    data: {
      studyId: study.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });

  await withServer(async (baseUrl) => {
    const response = await httpJson(baseUrl, `/v1/x-core/share/${encodeURIComponent(token)}`);

    assert.equal(response.status, 200);
    assert.equal(response.json.folderName, study.folderName);
    assert.equal(response.json.patientName, 'Sanitized Patient');
    assert.equal(response.json.series[0].has_labels, true);
    assert.equal(response.json.series[0].num_labels, 12);
    assert.equal(response.json.series[0].segmentation_method, 'heuristic_v2');
    assert.equal(response.json.series[0].segmentation_status, 'ready');
    assert.equal(response.json.patientId, undefined);
    assert.equal(response.json.id, undefined);
    assert.equal(response.json.series[0].id, undefined);
  });
});

test('GET /v1/x-core/share/:token/validate validates an active token', async () => {
  const { study } = await createFixtureStudy();
  const token = jwt.sign(
    { studyId: study.id.toString(), folderId: study.folderName },
    process.env.SHARE_SECRET,
    { expiresIn: '72h' }
  );
  await prisma.studyShare.create({
    data: {
      studyId: study.id,
      token,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000)
    }
  });

  await withServer(async (baseUrl) => {
    const response = await httpJson(baseUrl, `/v1/x-core/share/${encodeURIComponent(token)}/validate`);

    assert.equal(response.status, 200);
    assert.equal(response.json.valid, true);
    assert.equal(response.json.studyId, study.id.toString());
    assert.equal(response.json.folderName, study.folderName);
    assert.ok(response.json.expiresAt);
  });
});

test('share endpoints reject invalid and expired tokens', async () => {
  const { study } = await createFixtureStudy();
  const expiredToken = jwt.sign(
    { studyId: study.id.toString(), folderId: study.folderName },
    process.env.SHARE_SECRET,
    { expiresIn: '-1s' }
  );
  await prisma.studyShare.create({
    data: {
      studyId: study.id,
      token: expiredToken,
      expiresAt: new Date(Date.now() - 60 * 1000)
    }
  });

  await withServer(async (baseUrl) => {
    const invalid = await httpJson(baseUrl, '/v1/x-core/share/not-a-token/validate');
    const expired = await httpJson(baseUrl, `/v1/x-core/share/${encodeURIComponent(expiredToken)}`);

    assert.equal(invalid.status, 404);
    assert.equal(expired.status, 410);
  });
});
