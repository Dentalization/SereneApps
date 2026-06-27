import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDeepDentalClient,
  createDeepDentalHeaders,
  resolveDeepDentalConfig,
} from '../src/pages/dentist-portal/ai/components/deepDentalClient.mjs';
import {
  buildAnnotatedImageDataUrl,
  normalizeVisualFindings,
} from '../src/pages/dentist-portal/ai/components/deepDentalSchemas.mjs';
import {
  buildImageQualityCoach,
} from '../src/pages/dentist-portal/ai/components/qualityCoach.mjs';

test('DeepDental config defaults to the local proxy and never to production cloud', () => {
  const config = resolveDeepDentalConfig({});

  assert.equal(config.baseUrl, '/py-api/api/v1');
  assert.equal(config.authMode, 'bearer-proxy');
  assert.equal(config.isConfigured, true);
  assert.equal(config.baseUrl.includes('api.dentalization.id'), false);
});

test('DeepDental client headers use bearer auth only and never browser API keys', () => {
  const headers = createDeepDentalHeaders({ accessToken: 'jwt-token', contentType: 'json' });

  assert.equal(headers.Authorization, 'Bearer jwt-token');
  assert.equal(headers['Content-Type'], 'application/json');
  assert.equal(Object.prototype.hasOwnProperty.call(headers, 'X-API-Key'), false);
});

test('annotated image data URL honors backend mime metadata', () => {
  assert.equal(
    buildAnnotatedImageDataUrl({
      annotated_image_base64: 'abc123',
      annotated_image_mime_type: 'image/png',
    }),
    'data:image/png;base64,abc123'
  );

  assert.equal(
    buildAnnotatedImageDataUrl({
      annotated_image_base64: 'data:image/webp;base64,webp-data',
      annotated_image_mime_type: 'image/jpeg',
    }),
    'data:image/webp;base64,webp-data'
  );
});

test('visual findings normalization records schema drift instead of hiding it', () => {
  const findings = normalizeVisualFindings({
    image_quality: { rating: 'fair', limiting_factors: ['blur'] },
    concern_level: { level: 'moderate' },
    annotated_image_base64: 'abc123',
  });

  assert.equal(findings.schema_version, '2026-05-07.deepdental.visual-findings.v1');
  assert.equal(findings.image_quality, 'fair');
  assert.equal(findings.concern_level, 'moderate');
  assert.deepEqual(findings.schema_warnings, [
    'image_quality_object_normalized',
    'concern_level_object_normalized',
    'annotated_image_mime_type_missing',
  ]);
});

test('DeepDental client follows the documented session messages path', async () => {
  const calls = [];
  const client = createDeepDentalClient({
    config: {
      baseUrl: 'https://deepdental.test/api/v1',
      isConfigured: true,
    },
    getAccessToken: () => 'jwt-token',
    retries: 0,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ messages: [], total: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  await client.loadMessages('session-1');

  assert.equal(calls[0].url, 'https://deepdental.test/api/v1/sessions/session-1/messages');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer jwt-token');
  assert.equal('analyzeFromDetections' in client, false);
});

test('quality coach blocks unsupported and oversized image files before analysis', () => {
  const unsupported = buildImageQualityCoach({
    name: 'scan.pdf',
    type: 'application/pdf',
    size: 1000,
  });
  assert.equal(unsupported.status, 'blocked');
  assert.equal(unsupported.canAnalyze, false);

  const oversized = buildImageQualityCoach({
    name: 'huge.jpg',
    type: 'image/jpeg',
    size: 16 * 1024 * 1024,
  });
  assert.equal(oversized.status, 'blocked');
  assert.equal(oversized.canAnalyze, false);
});
