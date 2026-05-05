export function mergeTranslationsDeep(target, source) {
  if (!source || typeof source !== 'object') return target || {};
  if (Array.isArray(source)) return [...source];
  const output = target && typeof target === 'object' && !Array.isArray(target)
    ? { ...target }
    : {};

  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      output[key] = mergeTranslationsDeep(output[key] || {}, sourceValue);
    } else {
      output[key] = sourceValue;
    }
  });

  return output;
}

export function resolveTranslation(source, key) {
  if (!source || typeof key !== 'string' || !key.trim()) return undefined;
  return key.split('.').reduce((value, part) => (
    value && typeof value === 'object' && part in value ? value[part] : undefined
  ), source);
}

export function interpolateTranslation(value, params = {}) {
  if (typeof value !== 'string' || !params || Object.keys(params).length === 0) {
    return value;
  }

  return Object.keys(params).reduce((str, param) => (
    str.replace(new RegExp(`{{${param}}}`, 'g'), String(params[param]))
  ), value);
}

export function translateWithFallback({
  translations,
  fallbackTranslations,
  key,
  params = {},
} = {}) {
  const optionParams = params && typeof params === 'object' && !Array.isArray(params) ? params : {};
  const {
    defaultValue,
    fallback,
    fallbackText,
    ...interpolationParams
  } = optionParams;

  const value = resolveTranslation(translations, key);
  const fallbackValue = resolveTranslation(fallbackTranslations, key);
  const resolved = value ?? fallbackValue ?? defaultValue ?? fallbackText ?? fallback;

  if (resolved === undefined || resolved === null) return '';
  return interpolateTranslation(resolved, interpolationParams);
}
