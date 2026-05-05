import assert from 'node:assert/strict';
import test from 'node:test';

import {
  interpolateTranslation,
  mergeTranslationsDeep,
  resolveTranslation,
  translateWithFallback,
} from '../src/utils/i18nRuntime.mjs';

test('translateWithFallback resolves current language before English fallback', () => {
  const current = { clinic: { sidebar: { teledentistry: 'Teledentistry Klinik' } } };
  const fallback = { clinic: { sidebar: { teledentistry: 'Teledentistry' } } };

  assert.equal(
    translateWithFallback({
      translations: current,
      fallbackTranslations: fallback,
      key: 'clinic.sidebar.teledentistry',
    }),
    'Teledentistry Klinik'
  );
});

test('translateWithFallback never leaks raw missing keys when fallback text is available', () => {
  assert.equal(
    translateWithFallback({
      translations: {},
      fallbackTranslations: {},
      key: 'clinic.sidebar.descriptions.teledentistry',
      params: { fallbackText: 'Live sessions and summaries' },
    }),
    'Live sessions and summaries'
  );
});

test('translateWithFallback supports defaultValue alias and interpolation', () => {
  assert.equal(
    translateWithFallback({
      translations: {},
      fallbackTranslations: { call: { ended: 'Session ended at {{time}}' } },
      key: 'call.ended',
      params: { time: '10:30', defaultValue: 'Done' },
    }),
    'Session ended at 10:30'
  );
});

test('resolveTranslation and mergeTranslationsDeep keep nested translation bundles stable', () => {
  const merged = mergeTranslationsDeep(
    { clinic: { sidebar: { schedule: 'Schedule' } } },
    { clinic: { sidebar: { teledentistry: 'Teledentistry' } } }
  );

  assert.equal(resolveTranslation(merged, 'clinic.sidebar.schedule'), 'Schedule');
  assert.equal(resolveTranslation(merged, 'clinic.sidebar.teledentistry'), 'Teledentistry');
  assert.equal(interpolateTranslation('Hello {{name}}', { name: 'Serene' }), 'Hello Serene');
});

test('mergeTranslationsDeep replaces arrays instead of merging numeric keys', () => {
  const merged = mergeTranslationsDeep(
    { clinic: { reports: { compliance: { legacy: 'old' } } } },
    { clinic: { reports: { compliance: ['Privacy', 'Security'] } } }
  );

  assert.deepEqual(resolveTranslation(merged, 'clinic.reports.compliance'), ['Privacy', 'Security']);
});

test('mergeTranslationsDeep replaces scalar placeholders with nested objects', () => {
  const merged = mergeTranslationsDeep(
    { clinic: { reports: { financial: 'Financial' } } },
    { clinic: { reports: { financial: { totalRevenue: 'Total Revenue' } } } }
  );

  assert.deepEqual(resolveTranslation(merged, 'clinic.reports.financial'), {
    totalRevenue: 'Total Revenue',
  });
});
