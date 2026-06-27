import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  analyzeXCore2DSource,
  buildXCore2DAnalysisContext,
  buildXCore2DAnalysisFormData,
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
});
