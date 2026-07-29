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
import {
  mergeWorkspaceArtifactsIntoHistory,
  sortChatHistoryOldestFirst,
} from '../src/pages/dentist-portal/ai/components/chatHistoryModels.mjs';
import { hydrateWorkspaceImageArtifacts } from '../src/pages/dentist-portal/ai/components/workspaceArtifactHydration.mjs';
import { resolveWorkspaceArtifactUrl } from '../src/pages/dentist-portal/ai/components/workspaceArtifactUrls.mjs';

test('legacy case-storage paths are repaired to the active API prefix', () => {
  assert.equal(
    resolveWorkspaceArtifactUrl(
      '/api/v1/case-storage/legacy-token',
      'http://localhost:4000/v1'
    ),
    'http://localhost:4000/v1/case-storage/legacy-token'
  );
  assert.equal(
    resolveWorkspaceArtifactUrl(
      'https://artifacts.example.test/case-storage/external-token',
      'http://localhost:4000/v1'
    ),
    'https://artifacts.example.test/case-storage/external-token'
  );
});

test('history artifacts are fetched immediately and converted to non-expiring blob URLs', async () => {
  const fetched = [];
  const hydrated = await hydrateWorkspaceImageArtifacts({
    images: [{
      id: 'image-1',
      signed_url: 'http://api.test/v1/case-storage/original-token',
      signed_url_request: '/v1/case-storage/original-token',
      annotated_image_signed_url: 'http://api.test/v1/case-storage/annotated-token',
      annotated_image_signed_url_request: '/v1/case-storage/annotated-token',
    }],
    fetchArtifactBlob: async (url) => {
      fetched.push(url);
      return new Blob([url]);
    },
    createObjectUrl: (blob) => `blob:test-${blob.size}`,
  });

  assert.deepEqual(fetched, [
    '/v1/case-storage/original-token',
    '/v1/case-storage/annotated-token',
  ]);
  assert.match(hydrated[0].signed_url, /^blob:test-/);
  assert.match(hydrated[0].annotated_image_signed_url, /^blob:test-/);
  assert.equal(hydrated[0].original_artifact_status, 'ready');
  assert.equal(hydrated[0].annotated_image_artifact_status, 'ready');
});

test('unavailable history artifacts are marked without leaving broken signed URLs', async () => {
  const hydrated = await hydrateWorkspaceImageArtifacts({
    images: [{ id: 'image-1', signed_url: '/v1/case-storage/expired' }],
    fetchArtifactBlob: async () => { throw new Error('404'); },
    createObjectUrl: () => 'blob:should-not-be-used',
  });

  assert.equal(hydrated[0].signed_url, null);
  assert.equal(hydrated[0].original_artifact_status, 'unavailable');
  assert.equal(hydrated[0].annotated_image_artifact_status, 'missing');
});

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

test('DeepDental client follows the documented session messages path with explicit full-history pagination', async () => {
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

  assert.equal(calls[0].url, 'https://deepdental.test/api/v1/sessions/session-1/messages?page=1&per_page=100');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer jwt-token');
  assert.equal('analyzeFromDetections' in client, false);
});

test('DeepDental client loads every session and message page instead of stopping at page one', async () => {
  const calls = [];
  const client = createDeepDentalClient({
    config: {
      baseUrl: 'https://deepdental.test/api/v1',
      isConfigured: true,
    },
    retries: 0,
    fetchImpl: async (url) => {
      const parsed = new URL(url);
      const page = Number(parsed.searchParams.get('page') || 1);
      const isMessages = parsed.pathname.endsWith('/messages');
      const total = isMessages ? 205 : 102;
      const start = (page - 1) * 100;
      const length = Math.max(0, Math.min(100, total - start));
      const records = Array.from({ length }, (_, index) => ({
        id: `${isMessages ? 'message' : 'session'}-${start + index + 1}`,
        created_at: new Date(start + index + 1).toISOString(),
      }));
      calls.push(parsed.pathname + parsed.search);
      return new Response(JSON.stringify({
        [isMessages ? 'messages' : 'sessions']: records,
        page,
        per_page: 100,
        total,
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  const [messages, sessionsPayload] = await Promise.all([
    client.loadMessages('session-1'),
    client.fetchSessions(),
  ]);

  assert.equal(messages.length, 205);
  assert.equal(messages[0].id, 'message-1');
  assert.equal(messages.at(-1).id, 'message-205');
  assert.equal(sessionsPayload.sessions.length, 102);
  assert.ok(calls.includes('/api/v1/sessions/session-1/messages?page=3&per_page=100'));
  assert.ok(calls.includes('/api/v1/sessions?page=2&per_page=100'));
});

test('DeepDental client continues bare-array history pages until the server returns empty', async () => {
  const requestedPages = [];
  const client = createDeepDentalClient({
    config: { baseUrl: 'https://deepdental.test/api/v1', isConfigured: true },
    retries: 0,
    fetchImpl: async (url) => {
      const page = Number(new URL(url).searchParams.get('page') || 1);
      requestedPages.push(page);
      const pageRecords = {
        1: [{ id: 'message-1' }, { id: 'message-2' }],
        2: [{ id: 'message-3' }],
        3: [],
      }[page] || [];
      return new Response(JSON.stringify(pageRecords), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  const messages = await client.loadMessages('session-1');

  assert.deepEqual(messages.map((message) => message.id), ['message-1', 'message-2', 'message-3']);
  assert.deepEqual(requestedPages, [1, 2, 3]);
});

test('chat history is sorted oldest first and reconstructs missing workspace image turns', () => {
  const messages = [
    { id: 'assistant-later', type: 'ai', content: 'Jawaban lanjutan', timestamp: '2026-07-20T10:04:00.000Z' },
    { id: 'user-first', type: 'user', content: 'Keluhan awal', timestamp: '2026-07-20T10:00:00.000Z' },
  ];
  const workspace = {
    caseRecord: { id: 'case-1', created_at: '2026-07-20T10:01:00.000Z' },
    images: [{
      id: 'image-1',
      file_name: 'intraoral.jpg',
      signed_url: '/v1/case-storage/original-token',
      annotated_image_signed_url: '/v1/case-storage/annotated-token',
      annotated_image_mime_type: 'image/png',
      quality_status: 'acceptable',
      created_at: '2026-07-20T10:01:00.000Z',
      updated_at: '2026-07-20T10:02:00.000Z',
    }],
    findings: [{
      id: 'finding-1',
      image_id: 'image-1',
      label: 'caries',
      tooth_or_region: 'FDI 46',
      notes: 'Lesi oklusal perlu korelasi klinis.',
      severity: 'moderate',
      confidence: 0.81,
      raw_ai_result: { concern_level: 'moderate', recommendations: ['Lakukan pemeriksaan klinis.'] },
    }],
    auditEvents: [
      {
        event_type: 'image_analysis_started',
        after_json: { image_id: 'image-1', context: 'Tolong analisis lesi pada gigi 46.' },
      },
      {
        event_type: 'image_analysis_snapshot',
        after_json: {
          image_id: 'image-1',
          visual_findings: {
            concern_level: 'high',
            recommendations: ['Snapshot recommendation.'],
            limitations: 'Snapshot limitation.',
          },
        },
      },
    ],
  };

  const hydrated = mergeWorkspaceArtifactsIntoHistory({
    messages,
    workspace,
    authBaseUrl: 'http://localhost:4000/v1',
  });

  assert.deepEqual(hydrated.map((message) => message.id), [
    'user-first',
    'workspace-user-image-1',
    'workspace-ai-image-1',
    'assistant-later',
  ]);
  assert.equal(hydrated[1].content, 'Tolong analisis lesi pada gigi 46.');
  assert.equal(hydrated[1].image.url, 'http://localhost:4000/v1/case-storage/original-token');
  assert.equal(
    hydrated[2].visualFindings.annotated_image_signed_url,
    'http://localhost:4000/v1/case-storage/annotated-token'
  );
  assert.equal(hydrated[2].visualFindings.findings[0].description, 'Lesi oklusal perlu korelasi klinis.');
  assert.equal(hydrated[2].visualFindings.limitations, 'Snapshot limitation.');
});

test('workspace hydration enriches an existing image turn without duplicating it', () => {
  const existing = sortChatHistoryOldestFirst([
    {
      id: 'assistant-image',
      type: 'ai',
      content: 'Analisis lama',
      timestamp: '2026-07-20T10:01:00.000Z',
      visualFindings: { findings: [{ description: 'Existing finding.' }] },
    },
    {
      id: 'user-image',
      type: 'user',
      content: 'Analisis gambar ini',
      timestamp: '2026-07-20T10:00:00.000Z',
      image: { name: 'scan.jpg', url: null },
    },
  ]);
  const hydrated = mergeWorkspaceArtifactsIntoHistory({
    messages: existing,
    workspace: {
      images: [{
        id: 'image-1',
        file_name: 'scan.jpg',
        signed_url: '/v1/case-storage/original-fresh',
        annotated_image_signed_url: '/v1/case-storage/annotated-fresh',
        created_at: '2026-07-20T10:00:00.000Z',
      }],
      findings: [],
    },
    authBaseUrl: 'http://localhost:4000/v1',
  });

  assert.equal(hydrated.length, 2);
  assert.equal(hydrated[0].image.url, 'http://localhost:4000/v1/case-storage/original-fresh');
  assert.equal(
    hydrated[1].visualFindings.annotated_image_signed_url,
    'http://localhost:4000/v1/case-storage/annotated-fresh'
  );
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
