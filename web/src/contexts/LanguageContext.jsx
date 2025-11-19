import React, { createContext, useContext, useState, useEffect } from 'react';

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

  // Load translations based on language
  useEffect(() => {
    const loadTranslations = async () => {
      console.log('LanguageContext: Loading translations for language:', language);
      try {
        const translationModule = await import(`../translations/${language}.js`);
        let mergedTranslations = translationModule.default || {};

        try {
          const extraModule = await import(`../translations/${language}2.js`);
          mergedTranslations = mergeDeep(mergedTranslations, extraModule.default || {});
        } catch (extraError) {
          console.warn(`LanguageContext: No extended translations found for ${language}`, extraError);
        }

        console.log('LanguageContext: Successfully loaded translations for:', language);
        setTranslations(mergedTranslations);
      } catch (error) {
        console.error('Failed to load translations:', error);
        // Fallback to English if translation fails
        if (language !== 'en') {
          console.log('LanguageContext: Falling back to English');
          const fallbackModule = await import('../translations/en.js');
          let mergedFallback = fallbackModule.default || {};
          try {
            const fallbackExtra = await import('../translations/en2.js');
            mergedFallback = mergeDeep(mergedFallback, fallbackExtra.default || {});
          } catch (fallbackExtraError) {
            console.warn('LanguageContext: No extended translations for English', fallbackExtraError);
          }
          setTranslations(mergedFallback);
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

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Return key if translation not found
        return key;
      }
    }

    // Replace parameters in translation
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return Object.keys(params).reduce((str, param) => {
        return str.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
      }, value);
    }

    return value || key;
  };

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
      translations
    }}>
      {children}
    </LanguageContext.Provider>
  );
};
