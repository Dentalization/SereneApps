import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { translate } from '../i18n';

export default function useI18n() {
  const language = useSelector((state) => state.settings.language) || 'id';

  const t = useCallback((key, params = {}) => (
    translate(language === 'en' ? 'en' : 'id', key, params)
  ), [language]);

  return { language, t };
}

export { useI18n };
