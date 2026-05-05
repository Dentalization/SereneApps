import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  mergeTranslationsDeep,
  resolveTranslation,
  translateWithFallback,
} from '../utils/i18nRuntime.mjs';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState({});
  const [fallbackTranslations, setFallbackTranslations] = useState({});

  const loadLanguageBundle = async (languageCode) => {
    const translationModule = await import(`../translations/${languageCode}.js`);
    let mergedTranslations = translationModule.default || {};

    try {
      const extraModule = await import(`../translations/${languageCode}2.js`);
      mergedTranslations = mergeTranslationsDeep(mergedTranslations, extraModule.default || {});
    } catch (extraError) {
      console.warn(`LanguageContext: No extended translations found for ${languageCode}`, extraError);
    }

    try {
      const coverageModule = await import('../translations/coverage.js');
      mergedTranslations = mergeTranslationsDeep(mergedTranslations, coverageModule.default?.[languageCode] || {});
    } catch (coverageError) {
      console.warn(`LanguageContext: No coverage translations found for ${languageCode}`, coverageError);
    }

    return mergedTranslations;
  };

  // Load translations based on language
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const mergedTranslations = await loadLanguageBundle(language);
        const mergedFallback = language === 'en'
          ? mergedTranslations
          : await loadLanguageBundle('en');

        setTranslations(mergedTranslations);
        setFallbackTranslations(mergedFallback);
      } catch (error) {
        console.error('Failed to load translations:', error);
        // Fallback to English if translation fails
        if (language !== 'en') {
          const mergedFallback = await loadLanguageBundle('en');
          setTranslations(mergedFallback);
          setFallbackTranslations(mergedFallback);
        }
      }
    };

    loadTranslations();
  }, [language]);

  // Save language preference to localStorage
  useEffect(() => {
    localStorage.setItem('dentist-portal-language', language);
  }, [language]);

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('dentist-portal-language');
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'id')) {
      setLanguage(savedLanguage);
    }
  }, []);

  const t = useCallback((key, params = {}) => {
    const resolved = translateWithFallback({
      translations,
      fallbackTranslations,
      key,
      params,
    });
    if (import.meta.env.DEV) {
      const hasCurrent = resolveTranslation(translations, key) !== undefined;
      const hasFallback = resolveTranslation(fallbackTranslations, key) !== undefined;
      const hasExplicitFallback = params?.defaultValue !== undefined || params?.fallbackText !== undefined || params?.fallback !== undefined;
      if (!hasCurrent && !hasFallback && !hasExplicitFallback) {
        console.warn(`LanguageContext: missing translation for "${key}" in ${language}`);
      }
    }

    return resolved;
  }, [fallbackTranslations, language, translations]);

  const tSafe = useCallback((key, fallbackText, params = {}) => (
    t(key, { ...params, fallbackText })
  ), [t]);

  const changeLanguage = (newLanguage) => {
    if (newLanguage === 'en' || newLanguage === 'id') {
      setLanguage(newLanguage);
    }
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage: changeLanguage,
      changeLanguage,
      t,
      tSafe,
      translations,
      fallbackTranslations
    }}>
      {children}
    </LanguageContext.Provider>
  );
};
