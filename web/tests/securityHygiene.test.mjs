import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const httpClientSource = fs.readFileSync(
  path.resolve('web/src/utils/httpClient.js'),
  'utf8'
);

test('authenticated HTTP client does not log bearer token material', () => {
  assert.equal(httpClientSource.includes('AuthHttp: Sending token'), false);
  assert.equal(/token\.substring\s*\(/.test(httpClientSource), false);
});
