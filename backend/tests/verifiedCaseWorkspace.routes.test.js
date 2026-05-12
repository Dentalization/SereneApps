import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import { createVerifiedCasesRouter } from '../src/routes/verified-cases.js';
import { createVerifiedCaseWorkspaceService } from '../src/services/verifiedCaseWorkspaceService.js';
import { createMemoryVerifiedCaseWorkspaceRepository } from '../src/repositories/verifiedCaseWorkspaceRepository.js';
import { createMemoryImageStorageAdapter } from '../src/services/verifiedCaseImageStorage.js';

const previousSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'verified-case-route-test-secret';

function token(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function imageFile() {
  return { originalname: 'route.jpg', mimetype: 'image/jpeg', size: 6, buffer: Buffer.from('image!') };
}

async function withServer(service, fn) {
  const app = express();
  app.use(express.json());
  app.use('/v1', createVerifiedCasesRouter({ service }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const baseUrl = `${origin}/v1`;
  try {
    await fn(baseUrl, origin);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function makeService() {
  return createVerifiedCaseWorkspaceService({
    repository: createMemoryVerifiedCaseWorkspaceRepository(),
    storage: createMemoryImageStorageAdapter(),
    aiAdapter: {
      analyzeImage: async () => ({
        raw_ai_result: { ok: true },
        normalized_findings: { findings: [{ label: 'caries', severity: 'moderate' }] },
      }),
    },
    now: () => new Date('2026-05-08T02:00:00.000Z'),
  });
}

async function jsonFetch(baseUrl, path, body, bearerToken = token({ sub: '1001', roles: ['dentist'], clinicId: 'clinic-a', tenantId: 'tenant-a' }), extraHeaders = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

test('route analyze without quality check returns 400 quality_check_required', async () => {
  const service = makeService();
  const created = await service.createCase({ title: 'Route quality', actor: { id: '1001', role: 'dentist', clinicId: 'clinic-a', tenantId: 'tenant-a' } });
  const image = await service.addCaseImage({ caseId: created.id, file: imageFile(), actor: { id: '1001', role: 'dentist', clinicId: 'clinic-a', tenantId: 'tenant-a' } });

  await withServer(service, async (baseUrl) => {
    const { response, data } = await jsonFetch(baseUrl, `/cases/${created.id}/images/${image.id}/analyze`, {});
    assert.equal(response.status, 400);
    assert.equal(data.error.code, 'quality_check_required');
  });
});

test('route ignores tenant header fallback and rejects dentist tokens without clinic scope', async () => {
  const service = makeService();
  await service.createCase({ title: 'Scoped case', actor: { id: '1001', role: 'dentist', clinicId: 'clinic-a', tenantId: 'tenant-a' } });

  await withServer(service, async (baseUrl) => {
    const { response, data } = await jsonFetch(
      baseUrl,
      '/cases',
      undefined,
      token({ sub: '9999', roles: ['dentist'] }),
      { 'x-clinic-id': 'clinic-a', 'x-tenant-id': 'tenant-a' }
    );
    assert.equal(response.status, 403);
    assert.equal(data.error.code, 'tenant_scope_required');
  });
});

test('route serves uploaded images through signed case storage endpoint', async () => {
  const service = makeService();
  const actor = { id: '1001', role: 'dentist', clinicId: 'clinic-a', tenantId: 'tenant-a' };
  const created = await service.createCase({ title: 'Signed storage', actor });
  const image = await service.addCaseImage({ caseId: created.id, file: imageFile(), actor });

  assert.match(image.signed_url, /^\/v1\/case-storage\//);
  assert.doesNotMatch(image.signed_url, /^\/uploads\/verified-cases\//);

  await withServer(service, async (_baseUrl, origin) => {
    const response = await fetch(`${origin}${image.signed_url}`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'image!');
  });
});

test('route analyze rejected image returns 400 image_quality_blocks_analysis and acceptable image succeeds', async () => {
  const service = makeService();
  const actor = { id: '1001', role: 'dentist', clinicId: 'clinic-a', tenantId: 'tenant-a' };
  const created = await service.createCase({ title: 'Route acceptable', actor });
  const image = await service.addCaseImage({ caseId: created.id, file: imageFile(), actor });
  await service.runQualityCheck({
    caseId: created.id,
    imageId: image.id,
    actor,
    metrics: { width: 240, height: 240, blur: 0.9, brightness: 0.1, contrast: 0.2, dentalRelevance: 0.1, teethVisible: false },
  });

  await withServer(service, async (baseUrl) => {
    let result = await jsonFetch(baseUrl, `/cases/${created.id}/images/${image.id}/analyze`, {});
    assert.equal(result.response.status, 400);
    assert.equal(result.data.error.code, 'image_quality_blocks_analysis');

    await service.runQualityCheck({
      caseId: created.id,
      imageId: image.id,
      actor,
      metrics: { width: 1200, height: 900, blur: 0.05, brightness: 0.55, contrast: 0.72, dentalRelevance: 0.95, teethVisible: true },
    });
    result = await jsonFetch(baseUrl, `/cases/${created.id}/images/${image.id}/analyze`, {});
    assert.equal(result.response.status, 200);
    assert.equal(result.data.analysis.findings[0].status, 'ai_suggested');
  });
});

test('route export before verification returns 400 case_verification_required', async () => {
  const service = makeService();
  const created = await service.createCase({ title: 'Export route', patientId: '4001', actor: { id: '1001', role: 'dentist', clinicId: 'clinic-a', tenantId: 'tenant-a' } });

  await withServer(service, async (baseUrl) => {
    const { response, data } = await jsonFetch(baseUrl, `/cases/${created.id}/export/json`, { redacted: true });
    assert.equal(response.status, 400);
    assert.equal(data.error.code, 'case_verification_required');
  });
});

test.after(() => {
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});
