import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const webRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = path.resolve(webRoot, '..');
const read = (relativePath) => fs.readFileSync(path.resolve(repoRoot, relativePath), 'utf8');

test('DeepDental chat rendering does not inject untrusted HTML', () => {
  const source = read('web/src/pages/dentist-portal/ai/components/ChatMessage.jsx');

  assert.equal(source.includes('dangerouslySetInnerHTML'), false);
  assert.match(source, /ReactMarkdown/);
  assert.match(source, /rehypeSanitize/);
});

test('DeepDental annotated images are rendered through mime-aware helpers', () => {
  const source = read('web/src/pages/dentist-portal/ai/components/VisualFindingsCard.jsx');

  assert.equal(source.includes('data:image/jpeg;base64,'), false);
  assert.match(source, /buildAnnotatedImageDataUrl/);
});

test('DeepDental frontend source does not reference browser-exposed AI API key env vars', () => {
  const files = [
    'web/src/pages/dentist-portal/ai/components/useDentalAPI.js',
    'web/src/utils/httpClient.js',
  ];

  for (const file of files) {
    const source = read(file);
    assert.equal(source.includes('VITE_DEEPDENTAL_API_KEY'), false, file);
    assert.equal(source.includes('VITE_SERENE_AI_API_KEY'), false, file);
    assert.equal(source.includes("'X-API-Key'"), false, file);
    assert.equal(source.includes('"X-API-Key"'), false, file);
  }
});

test('DeepDental image artifacts are not cached in localStorage', () => {
  const source = read('web/src/pages/dentist-portal/ai/components/useDentalAPI.js');

  assert.equal(source.includes('SESSION_IMAGE_CACHE_KEY'), false);
  assert.equal(source.includes('userImageBase64'), false);
  assert.match(source, /clinicalArtifactStore/);
});
