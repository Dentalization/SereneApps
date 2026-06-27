import assert from 'node:assert/strict';
import test from 'node:test';

import { createDeepDentalCaseAnalysisAdapter } from '../src/services/verifiedCaseAnalysisAdapter.js';

test('case analysis adapter sends the documented image analysis multipart contract', async () => {
  let request;
  const adapter = createDeepDentalCaseAnalysisAdapter({
    baseUrl: 'https://deepdental.test',
    apiKey: 'server-key',
    fetchImpl: async (url, init) => {
      request = { url: String(url), init };
      return new Response(JSON.stringify({
        image_quality: 'adequate',
        findings: [],
        detections: [],
        concern_level: 'low',
        recommendations: [],
        limitations: 'Clinical confirmation is required.',
        annotated_image_base64: null,
        suggested_questions: [],
        processing_time_ms: 12,
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  await adapter.analyzeImage({
    imageBuffer: Buffer.from('image-bytes'),
    image: { file_name: 'scan.jpg', mime_type: 'image/jpeg' },
    context: 'Review tooth 36.',
  });

  assert.equal(request.url, 'https://deepdental.test/api/v1/images/analyze');
  assert.equal(request.init.headers['X-API-Key'], 'server-key');
  assert.deepEqual([...request.init.body.keys()], [
    'image',
    'context',
    'role',
    'include_annotated',
  ]);
  assert.match(request.init.body.get('context'), /Review tooth 36\./);
  assert.match(request.init.body.get('context'), /limitations/i);
  assert.equal(request.init.body.get('role'), 'dentist');
  assert.equal(request.init.body.get('include_annotated'), 'true');
  assert.equal(request.init.body.has('language'), false);
});

test('case analysis adapter retries once when DeepDental structured output parsing fails', async () => {
  const requests = [];
  const responses = [
    new Response(JSON.stringify({
      detail: 'Vision analysis error: Failed to parse DentistVisualAnalysisSchema. OUTPUT_PARSING_FAILURE',
    }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    }),
    new Response(JSON.stringify({
      image_quality: 'adequate',
      findings: [{ description: 'Possible proximal caries', severity: 'moderate' }],
      detections: [],
      concern_level: 'moderate',
      recommendations: ['Clinical examination is required.'],
      limitations: 'Image quality and field of view limit interpretation.',
      annotated_image_base64: null,
      suggested_questions: [],
      processing_time_ms: 25,
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  ];
  const adapter = createDeepDentalCaseAnalysisAdapter({
    baseUrl: 'https://deepdental.test',
    apiKey: 'server-key',
    fetchImpl: async (_url, init) => {
      requests.push(init);
      return responses.shift();
    },
  });

  const result = await adapter.analyzeImage({
    imageBuffer: Buffer.from('image-bytes'),
    image: { file_name: 'scan.jpg', mime_type: 'image/jpeg' },
    context: 'Prioritaskan regio posterior.',
  });

  assert.equal(requests.length, 2);
  assert.match(requests[0].body.get('context'), /Prioritaskan regio posterior\./);
  assert.match(requests[0].body.get('context'), /limitations/i);
  assert.match(requests[1].body.get('context'), /previous response failed/i);
  assert.equal(result.normalized_findings.findings.length, 1);
  assert.equal(result.raw_ai_result.limitations, 'Image quality and field of view limit interpretation.');
});

test('case analysis adapter does not retry authentication or validation failures', async () => {
  let requestCount = 0;
  const adapter = createDeepDentalCaseAnalysisAdapter({
    baseUrl: 'https://deepdental.test',
    apiKey: 'server-key',
    fetchImpl: async () => {
      requestCount += 1;
      return new Response(JSON.stringify({ detail: 'Invalid API key' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  await assert.rejects(
    () => adapter.analyzeImage({
      imageBuffer: Buffer.from('image-bytes'),
      image: { file_name: 'scan.jpg', mime_type: 'image/jpeg' },
    }),
    (error) => error.status === 401 && error.code === 'deepdental_analysis_failed'
  );
  assert.equal(requestCount, 1);
});

test('case analysis adapter promotes YOLO detections when detailed findings are empty', async () => {
  const adapter = createDeepDentalCaseAnalysisAdapter({
    baseUrl: 'https://deepdental.test',
    apiKey: 'server-key',
    fetchImpl: async () => new Response(JSON.stringify({
      image_quality: 'adequate',
      findings: [],
      detections: [{
        mark_id: '1',
        label: 'caries',
        confidence: 0.84,
        bbox: [10, 20, 30, 40],
      }],
      concern_level: 'moderate',
      recommendations: ['Perform a clinical examination.'],
      limitations: 'Radiographic interpretation requires clinical correlation.',
      annotated_image_base64: 'annotated-image',
      suggested_questions: ['Is the lesion symptomatic?'],
      processing_time_ms: 30,
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  });

  const result = await adapter.analyzeImage({
    imageBuffer: Buffer.from('image-bytes'),
    image: { file_name: 'scan.jpg', mime_type: 'image/jpeg' },
  });

  assert.equal(result.normalized_findings.findings.length, 1);
  assert.equal(result.normalized_findings.findings[0].label, 'caries');
  assert.equal(result.normalized_findings.findings[0].confidence, 0.84);
  assert.deepEqual(result.normalized_findings.recommendations, ['Perform a clinical examination.']);
  assert.equal(result.normalized_findings.limitations, 'Radiographic interpretation requires clinical correlation.');
});
