import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const httpClientSource = fs.readFileSync(
  new URL('../src/utils/httpClient.js', import.meta.url),
  'utf8'
);

test('authenticated HTTP client does not log bearer token material', () => {
  assert.equal(httpClientSource.includes('AuthHttp: Sending token'), false);
  assert.equal(/token\.substring\s*\(/.test(httpClientSource), false);
});

test('web source does not reference browser-exposed DeepDental API key variables', () => {
  const sourceRoots = [
    path.resolve(new URL('../src/pages/dentist-portal/ai', import.meta.url).pathname),
    path.resolve(new URL('../src/utils', import.meta.url).pathname),
  ];
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (/\.(js|jsx|mjs)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  };
  sourceRoots.forEach(walk);

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.equal(source.includes('VITE_DEEPDENTAL_API_KEY'), false, file);
    assert.equal(source.includes('VITE_SERENE_AI_API_KEY'), false, file);
  }
});
