import assert from 'node:assert/strict';
import test from 'node:test';
import { translate } from '../src/i18n/index.js';

test('mobile i18n returns known Indonesian and English values', () => {
  assert.equal(
    translate('id', 'mobile.teledentistry.network.diagnostics'),
    'Diagnostik Koneksi',
  );
  assert.equal(
    translate('en', 'mobile.teledentistry.network.diagnostics'),
    'Connection Diagnostics',
  );
});

test('mobile i18n uses fallback text and never leaks raw keys', () => {
  assert.equal(
    translate('id', 'mobile.missing.raw.key', { fallbackText: 'Fallback aman' }),
    'Fallback aman',
  );
  assert.equal(translate('id', 'mobile.missing.raw.key'), '');
});

test('mobile i18n interpolates parameters', () => {
  assert.equal(
    translate('id', 'mobile.missing.with.param', { fallbackText: 'Halo {{name}}', name: 'Ayu' }),
    'Halo Ayu',
  );
});
