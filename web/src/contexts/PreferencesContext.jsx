import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const DEFAULTS = {
  language: 'en',
  fontSize: 'medium',
  reducedMotion: false
};

const STORAGE_KEY = 'dentistPortalPreferences';

const PreferencesContext = createContext();

const readStoredPreferences = () => {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...parsed
    };
  } catch (error) {
    console.warn('Failed to parse stored preferences:', error);
    return DEFAULTS;
  }
};

export const PreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(() => readStoredPreferences());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to persist preferences:', error);
    }
  }, [preferences.language, preferences.fontSize, preferences.reducedMotion]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const lang = preferences.language || DEFAULTS.language;
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.dataset.language = lang;
  }, [preferences.language]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const mappings = {
      small: '93%',
      medium: '100%',
      large: '112%'
    };
    const size = mappings[preferences.fontSize] || mappings.medium;
    root.style.setProperty('--app-font-scale', size);
    root.style.fontSize = size;
    root.dataset.fontSize = preferences.fontSize || DEFAULTS.fontSize;
  }, [preferences.fontSize]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (preferences.reducedMotion) {
      root.dataset.motion = 'reduced';
    } else {
      delete root.dataset.motion;
    }
  }, [preferences.reducedMotion]);

  const updatePreferences = useCallback((updates) => {
    setPreferences((prev) => ({
      ...prev,
      ...updates
    }));
  }, []);

  const setLanguage = useCallback((language) => {
    updatePreferences({ language });
  }, [updatePreferences]);

  const setFontSize = useCallback((fontSize) => {
    updatePreferences({ fontSize });
  }, [updatePreferences]);

  const setReducedMotion = useCallback((reducedMotion) => {
    updatePreferences({ reducedMotion });
  }, [updatePreferences]);

  const value = useMemo(() => ({
    preferences,
    setLanguage,
    setFontSize,
    setReducedMotion
  }), [preferences, setLanguage, setFontSize, setReducedMotion]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

export default PreferencesContext;
