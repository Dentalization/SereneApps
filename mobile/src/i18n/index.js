import id from './id.js';
import en from './en.js';

export const translations = { id, en };

export function resolveTranslation(locale, key) {
  return String(key || '').split('.').reduce((cursor, segment) => {
    if (!cursor || typeof cursor !== 'object') return undefined;
    return cursor[segment];
  }, translations[locale]);
}

export function translate(locale = 'id', key, params = {}) {
  const fallbackText = params.fallbackText ?? params.defaultValue ?? params.fallback;
  const template =
    resolveTranslation(locale, key) ??
    resolveTranslation('en', key) ??
    fallbackText ??
    '';

  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  if (isDev && template === '' && !fallbackText) {
    console.warn(`[mobile-i18n] Missing translation key: ${key}`);
  }

  if (typeof template !== 'string') {
    return String(template ?? fallbackText ?? '');
  }

  return Object.entries(params).reduce((output, [param, value]) => (
    output.replaceAll(`{{${param}}}`, String(value))
  ), template);
}

export default translations;
