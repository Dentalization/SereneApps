import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { translate } from '../i18n';

export default function useI18n() {
  const language = useSelector((state) => state.settings?.language) || 'id';
  const normalizedLanguage = language === 'en' ? 'en' : 'id';

  const t = useCallback((key, params = {}) => (
    translate(normalizedLanguage, key, params)
  ), [normalizedLanguage]);

  return { language: normalizedLanguage, t };
}

export { useI18n };
