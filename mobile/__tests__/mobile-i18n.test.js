import { resolveTranslation, translate } from '../src/i18n/index.js';

describe('mobile i18n', () => {
  test('returns known Indonesian and English values', () => {
    expect(translate('id', 'mobile.teledentistry.network.diagnostics')).toBe('Diagnostik Koneksi');
    expect(translate('en', 'mobile.teledentistry.network.diagnostics')).toBe('Connection Diagnostics');
  });

  test('uses fallback text and never leaks raw keys', () => {
    expect(translate('id', 'mobile.missing.raw.key', { fallbackText: 'Fallback aman' })).toBe('Fallback aman');
    expect(translate('id', 'mobile.missing.raw.key')).toBe('');
  });

  test('interpolates parameters', () => {
    expect(translate('id', 'mobile.missing.with.param', {
      fallbackText: 'Halo {{name}}',
      name: 'Ayu',
    })).toBe('Halo Ayu');
  });

  test('resolves nested translation keys', () => {
    expect(resolveTranslation('id', 'mobile.teledentistry.network.lowQualityTitle')).toBe('Koneksi tidak stabil');
    expect(resolveTranslation('id', 'mobile.missing.raw.key')).toBeUndefined();
  });
});
