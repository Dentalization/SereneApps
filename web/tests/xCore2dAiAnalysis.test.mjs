import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  analyzeXCore2DSource,
  buildXCore2DAnalysisContext,
  buildXCore2DAnalysisFormData,
  getXCore2DAnalysisErrorMessage,
  normalizeXCore2DAnalysis,
} from '../src/pages/dentist-portal/x-core/services/xCore2dAiAnalysis.mjs';

test('X-Core 2D analysis context requests complete Indonesian clinical reasoning', () => {
  const context = buildXCore2DAnalysisContext({
    modality: 'OPG',
    seriesTitle: 'Panoramic',
  });

  assert.match(context, /OPG/);
  assert.match(context, /Panoramic/);
  assert.match(context, /Bahasa Indonesia/);
  assert.match(context, /diagnosis banding/i);
  assert.match(context, /limitations/i);
  assert.match(context, /processing_time_ms/);
  assert.match(context, /never omit required fields/i);
});

test('X-Core 2D analysis form follows the documented DeepDental multipart contract', () => {
  const formData = buildXCore2DAnalysisFormData({
    imageBlob: new Blob(['png-image'], { type: 'image/png' }),
    fileName: 'panoramic.png',
    context: 'Analyze this panoramic image.',
  });

  assert.deepEqual([...formData.keys()], [
    'image',
    'context',
    'role',
    'include_annotated',
  ]);
  assert.equal(formData.get('image').name, 'panoramic.png');
  assert.equal(formData.get('image').type, 'image/png');
  assert.equal(formData.get('context'), 'Analyze this panoramic image.');
  assert.equal(formData.get('role'), 'dentist');
  assert.equal(formData.get('include_annotated'), 'true');
  assert.equal(formData.has('language'), false);
});

test('X-Core 2D analysis rejects unsupported or empty image input before upload', () => {
  assert.throws(
    () => buildXCore2DAnalysisFormData({
      imageBlob: new Blob(['dicom'], { type: 'application/dicom' }),
    }),
    /Unsupported source image type/
  );
  assert.throws(
    () => buildXCore2DAnalysisFormData({
      imageBlob: new Blob([], { type: 'image/png' }),
    }),
    /source image is empty/
  );
});

test('X-Core 2D analysis fetches the original image and normalizes reasoning output', async () => {
  const calls = [];
  const client = {
    analyzeImage: async (formData, signal) => {
      calls.push({ formData, signal });
      return {
        image_quality: { rating: 'adequate', limiting_factors: ['minor glare'] },
        findings: [{
          mark_id: '1',
          location: '36',
          description: 'Radiolucency requiring clinical correlation.',
          severity: 'moderate',
          confidence: 'high',
          differentials: ['caries', 'restoration artifact'],
        }],
        detections: [{ mark_id: '1', label: 'caries', confidence: 0.88, bbox: [10, 20, 30, 40] }],
        concern_level: 'moderate',
        recommendations: ['Perform clinical examination.'],
        annotated_image_base64: 'annotated',
      };
    },
  };
  const controller = new AbortController();

  const result = await analyzeXCore2DSource({
    client,
    imageUrl: '/py-api/image/study/series',
    context: 'Analyze.',
    signal: controller.signal,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return new Response(new Blob(['source-image'], { type: 'image/png' }), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      });
    },
  });

  assert.equal(calls[0].url, '/py-api/image/study/series');
  assert.equal(calls[0].init.credentials, 'same-origin');
  assert.equal(calls[0].init.signal, controller.signal);
  assert.equal(calls[1].formData.get('image').type, 'image/png');
  assert.equal(result.image_quality, 'adequate');
  assert.equal(result.limitations, 'minor glare');
  assert.equal(result.findings[0].differentials.length, 2);
});

test('X-Core 2D analysis does not call DeepDental when the source image cannot be loaded', async () => {
  let analysisCalled = false;
  await assert.rejects(
    () => analyzeXCore2DSource({
      client: {
        analyzeImage: async () => {
          analysisCalled = true;
        },
      },
      imageUrl: '/py-api/image/missing/series',
      fetchImpl: async () => new Response(null, { status: 404 }),
    }),
    /Unable to load the X-Core source image/
  );
  assert.equal(analysisCalled, false);
});

test('X-Core 2D analysis repairs structured-output failures with fresh multipart data', async () => {
  const contexts = [];
  let sourceFetchCount = 0;
  const parseError = Object.assign(new Error('Failed to parse DentistVisualAnalysisSchema: limitations field required'), {
    status: 500,
    code: 'http_500',
  });
  const client = {
    analyzeImage: async (formData) => {
      contexts.push(formData.get('context'));
      if (contexts.length === 1) throw parseError;
      return {
        image_quality: 'adequate',
        findings: [],
        detections: [],
        concern_level: 'low',
        recommendations: [],
        limitations: 'Single-view image.',
        suggested_questions: [],
        processing_time_ms: 10,
      };
    },
  };

  const result = await analyzeXCore2DSource({
    client,
    imageUrl: '/py-api/image/study/series',
    context: buildXCore2DAnalysisContext(),
    retryDelayMs: 0,
    fetchImpl: async () => {
      sourceFetchCount += 1;
      return new Response(new Blob(['source-image'], { type: 'image/png' }), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      });
    },
  });

  assert.equal(sourceFetchCount, 1);
  assert.equal(contexts.length, 2);
  assert.match(contexts[1], /previous response failed/i);
  assert.equal(result.limitations, 'Single-view image.');
});

test('X-Core 2D analysis bounds repair attempts and does not retry validation errors', async () => {
  let parsingAttempts = 0;
  await assert.rejects(
    () => analyzeXCore2DSource({
      client: {
        analyzeImage: async () => {
          parsingAttempts += 1;
          throw Object.assign(new Error('OUTPUT_PARSING_FAILURE: limitations missing'), {
            status: 500,
          });
        },
      },
      imageUrl: '/py-api/image/study/series',
      context: buildXCore2DAnalysisContext(),
      retryDelayMs: 0,
      fetchImpl: async () => new Response(new Blob(['source'], { type: 'image/png' }), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    }),
    /OUTPUT_PARSING_FAILURE/
  );
  assert.equal(parsingAttempts, 3);

  let validationAttempts = 0;
  await assert.rejects(
    () => analyzeXCore2DSource({
      client: {
        analyzeImage: async () => {
          validationAttempts += 1;
          throw Object.assign(new Error('Unsupported image'), { status: 422 });
        },
      },
      imageUrl: '/py-api/image/study/series',
      retryDelayMs: 0,
      fetchImpl: async () => new Response(new Blob(['source'], { type: 'image/png' }), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    }),
    /Unsupported image/
  );
  assert.equal(validationAttempts, 1);
});

test('X-Core 2D normalization accepts observed finding aliases and timeout errors stay visible', () => {
  const normalized = normalizeXCore2DAnalysis({
    image_quality: 'adequate',
    findings: [{
      mark_id: '[1]',
      location: 'FDI 47',
      finding: 'Brown opacity visible in the occlusal fissure.',
      differentials: ['Extrinsic staining', 'Early demineralization'],
      severity: 'mild',
      confidence: 'medium',
    }],
    detections: [],
    concern_level: 'low',
    recommendations: [],
    limitations: 'Single-view image.',
  });

  assert.equal(normalized.findings[0].description, 'Brown opacity visible in the occlusal fissure.');
  assert.match(
    getXCore2DAnalysisErrorMessage(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })),
    /waktu/i
  );
  assert.match(
    getXCore2DAnalysisErrorMessage(Object.assign(new Error('request_timeout'), { code: 'request_timeout' })),
    /waktu/i
  );
});

test('X-Core 2D AI integration keeps credentials server-side and renders reasoning as React text', () => {
  const serviceSource = fs.readFileSync(
    new URL('../src/pages/dentist-portal/x-core/services/xCore2dAiAnalysis.mjs', import.meta.url),
    'utf8'
  );
  const panelSource = fs.readFileSync(
    new URL('../src/pages/dentist-portal/x-core/components/XCoreAiAnalysisPanel.jsx', import.meta.url),
    'utf8'
  );

  assert.doesNotMatch(serviceSource, /X-API-Key|localStorage|sessionStorage/);
  assert.doesNotMatch(panelSource, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(panelSource, /<section(?:\s|>)/);
});
