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
import {
  buildVisualFindingsFromCaseAnalysis,
  rehydrateAnnotatedImageArtifacts,
  resolveWorkspaceAssetUrl,
} from '../src/pages/dentist-portal/ai/components/caseAnalysisMapper.mjs';
import {
  buildFollowUpMessage,
  buildJournalReferenceQuestion,
  buildPriorImageContext,
} from '../src/pages/dentist-portal/ai/components/dentalConversationContext.mjs';

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

test('workspace analysis mapping preserves annotated image fallback and differentials', () => {
  const findings = buildVisualFindingsFromCaseAnalysis({
    analysis: {
      visual_findings: {
        image_quality: 'adequate',
        concern_level: 'low',
        findings: [{
          location: 'FDI 47',
          finding: 'Possible early enamel change.',
          severity: 'mild',
          confidence: 'low',
          differentials: ['Extrinsic staining', 'Early demineralization'],
        }],
        detections: [],
        recommendations: ['Perform clinical examination.'],
        limitations: 'Single-view image.',
        annotated_image_base64: 'base64-fallback',
      },
      image: {
        annotated_image_mime_type: 'image/jpeg',
        annotated_image_signed_url: '/v1/case-storage/signed-token',
      },
    },
    authBaseUrl: 'http://localhost:4000/v1',
  });

  assert.equal(findings.concern_level, 'low');
  assert.equal(findings.findings[0].description, 'Possible early enamel change.');
  assert.deepEqual(findings.findings[0].differentials, ['Extrinsic staining', 'Early demineralization']);
  assert.equal(findings.annotated_image_base64, 'base64-fallback');
  assert.equal(findings.annotated_image_signed_url, 'http://localhost:4000/v1/case-storage/signed-token');
});

test('workspace signed artifact URL resolves against the backend origin', () => {
  assert.equal(
    resolveWorkspaceAssetUrl('/v1/case-storage/token', 'https://api.serene.test/v1'),
    'https://api.serene.test/v1/case-storage/token'
  );
  assert.equal(
    resolveWorkspaceAssetUrl('data:image/jpeg;base64,abc', 'https://api.serene.test/v1'),
    'data:image/jpeg;base64,abc'
  );
});

test('workspace persisted finding fallback preserves differentials', () => {
  const findings = buildVisualFindingsFromCaseAnalysis({
    analysis: {
      findings: [{
        tooth_or_region: 'FDI 45',
        notes: 'Surface opacity requires clinical correlation.',
        severity: 'mild',
        confidence: 'low',
        differentials: ['Fluorosis', 'Early demineralization'],
      }],
      visual_findings: {
        image_quality: 'adequate',
        concern_level: 'low',
        findings: [],
        detections: [],
      },
    },
  });

  assert.deepEqual(findings.findings[0].differentials, ['Fluorosis', 'Early demineralization']);
});

test('session history replaces expired annotated URLs with fresh workspace artifacts', () => {
  const messages = [
    {
      id: 'assistant-1',
      type: 'ai',
      visualFindings: {
        detections: [{ label: 'caries', confidence: 0.42 }],
        annotated_image_signed_url: 'http://localhost:4000/v1/case-storage/expired-token',
      },
    },
    {
      id: 'assistant-follow-up',
      type: 'ai',
      visualFindings: null,
    },
    {
      id: 'assistant-2',
      type: 'ai',
      visualFindings: {
        findings: [{ description: 'Second image finding.' }],
        annotated_image_signed_url: 'http://localhost:4000/v1/case-storage/another-expired-token',
      },
    },
  ];
  const images = [
    {
      id: 'image-1',
      created_at: '2026-06-28T01:00:00.000Z',
      annotated_image_mime_type: 'image/png',
      annotated_image_signed_url: '/v1/case-storage/fresh-token-1',
    },
    {
      id: 'image-2',
      created_at: '2026-06-28T01:01:00.000Z',
      annotated_image_mime_type: 'image/jpeg',
      annotated_image_signed_url: '/v1/case-storage/fresh-token-2',
    },
  ];

  const hydrated = rehydrateAnnotatedImageArtifacts({
    messages,
    images,
    authBaseUrl: 'http://localhost:4000/v1',
  });

  assert.equal(
    hydrated[0].visualFindings.annotated_image_signed_url,
    'http://localhost:4000/v1/case-storage/fresh-token-1'
  );
  assert.equal(hydrated[0].visualFindings.annotated_image_mime_type, 'image/png');
  assert.equal(hydrated[1], messages[1]);
  assert.equal(
    hydrated[2].visualFindings.annotated_image_signed_url,
    'http://localhost:4000/v1/case-storage/fresh-token-2'
  );
  assert.equal(messages[0].visualFindings.annotated_image_signed_url.includes('expired-token'), true);
});

test('follow-up context carries prior image findings and builds a focused journal question', () => {
  const visualFindings = {
    image_quality: 'adequate',
    concern_level: 'moderate',
    detections: [{ mark_id: '1', label: 'caries', confidence: 0.42 }],
    findings: [{
      location: 'FDI 47',
      description: 'Possible occlusal lesion.',
      severity: 'mild',
      differentials: ['Staining', 'Early demineralization'],
    }],
    limitations: 'Single intraoral photograph.',
  };
  const messages = [{ type: 'ai', visualFindings }];

  const context = buildPriorImageContext(messages);
  const followUpMessage = buildFollowUpMessage(messages, 'Apa langkah berikutnya?');
  const question = buildJournalReferenceQuestion({
    message: 'Apa langkah berikutnya?',
    findings: visualFindings,
  });

  assert.match(context, /KONTEKS ANALISIS GAMBAR DENTAL SESI INI/);
  assert.match(context, /caries \(42% confidence, mark 1\)/);
  assert.match(context, /Possible occlusal lesion/);
  assert.match(context, /Staining, Early demineralization/);
  assert.match(followUpMessage, /Dentist Question: Apa langkah berikutnya\?/);
  assert.match(followUpMessage, /Possible occlusal lesion/);
  assert.match(question, /Apa langkah berikutnya\?/);
  assert.match(question, /FDI 47/);
  assert.match(question, /evidence klinis/i);
});
