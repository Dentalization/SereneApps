import id from './id';
import en from './en';

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
    key;

  if (typeof template !== 'string') {
    return String(template ?? fallbackText ?? key);
  }

  return Object.entries(params).reduce((output, [param, value]) => (
    output.replaceAll(`{{${param}}}`, String(value))
  ), template);
}

export default translations;
