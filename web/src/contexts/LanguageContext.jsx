import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

  const mergeDeep = (target, source) => {
    if (!source || typeof source !== 'object') return target;
    const output = Array.isArray(target) ? [...target] : { ...target };
    Object.keys(source).forEach((key) => {
      const sourceValue = source[key];
      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        output[key] = mergeDeep(output[key] || {}, sourceValue);
      } else {
        output[key] = sourceValue;
      }
    });
    return output;
  };

  const loadLanguageBundle = async (languageCode) => {
    const translationModule = await import(`../translations/${languageCode}.js`);
    let mergedTranslations = translationModule.default || {};

    try {
      const extraModule = await import(`../translations/${languageCode}2.js`);
      mergedTranslations = mergeDeep(mergedTranslations, extraModule.default || {});
    } catch (extraError) {
      console.warn(`LanguageContext: No extended translations found for ${languageCode}`, extraError);
    }

    try {
      const coverageModule = await import('../translations/coverage.js');
      mergedTranslations = mergeDeep(mergedTranslations, coverageModule.default?.[languageCode] || {});
    } catch (coverageError) {
      console.warn(`LanguageContext: No coverage translations found for ${languageCode}`, coverageError);
    }

    return mergedTranslations;
  };

  // Load translations based on language
  useEffect(() => {
    const loadTranslations = async () => {
      console.log('LanguageContext: Loading translations for language:', language);
      try {
        const mergedTranslations = await loadLanguageBundle(language);
        const mergedFallback = language === 'en'
          ? mergedTranslations
          : await loadLanguageBundle('en');

        console.log('LanguageContext: Successfully loaded translations for:', language);
        setTranslations(mergedTranslations);
        setFallbackTranslations(mergedFallback);
      } catch (error) {
        console.error('Failed to load translations:', error);
        // Fallback to English if translation fails
        if (language !== 'en') {
          console.log('LanguageContext: Falling back to English');
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

  const resolveTranslation = useCallback((source, key) => {
    const keys = key.split('.');
    let value = source;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value;
  }, []);

  const interpolate = useCallback((value, params = {}) => {
    if (typeof value !== 'string' || Object.keys(params).length === 0) {
      return value;
    }

    return Object.keys(params).reduce((str, param) => {
      return str.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
    }, value);
  }, []);

  const t = useCallback((key, params = {}) => {
    const optionParams = params && typeof params === 'object' && !Array.isArray(params) ? params : {};
    const {
      defaultValue,
      fallback,
      ...interpolationParams
    } = optionParams;

    const value = resolveTranslation(translations, key);
    const fallbackValue = resolveTranslation(fallbackTranslations, key);
    const resolved = value ?? fallbackValue ?? defaultValue ?? fallback;

    if (resolved !== undefined && resolved !== null) {
      return interpolate(resolved, interpolationParams);
    }

    if (import.meta.env.DEV) {
      console.warn(`LanguageContext: missing translation for "${key}" in ${language}`);
    }

    return '';
  }, [fallbackTranslations, interpolate, language, resolveTranslation, translations]);

  const changeLanguage = (newLanguage) => {
    console.log('LanguageContext: changeLanguage called with:', newLanguage);
    if (newLanguage === 'en' || newLanguage === 'id') {
      console.log('LanguageContext: Setting language to:', newLanguage);
      setLanguage(newLanguage);
    } else {
      console.log('LanguageContext: Invalid language:', newLanguage);
    }
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage: changeLanguage,
      changeLanguage,
      t,
      translations,
      fallbackTranslations
    }}>
      {children}
    </LanguageContext.Provider>
  );
};
