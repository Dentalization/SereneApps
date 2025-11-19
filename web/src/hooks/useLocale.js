import { useCallback, useMemo } from 'react';
import { usePreferences } from '../contexts/PreferencesContext';

const useLocale = () => {
  const { preferences } = usePreferences();
  const language = preferences?.language || 'en';

  const translate = useCallback(
    (english, indonesian) => {
      if (language === 'id') {
        return typeof indonesian === 'string' ? indonesian : english;
      }
      return english;
    },
    [language]
  );

  return useMemo(
    () => ({
      language,
      translate,
      t: translate
    }),
    [language, translate]
  );
};

export default useLocale;
