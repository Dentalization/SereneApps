import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { themeTransition, initializeAppTheme } from '../utils/themeTransition';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const initialIsDark = React.useMemo(() => initializeAppTheme(), []);
  const storedMode = typeof window !== 'undefined' ? localStorage.getItem('preferredThemeMode') : null;

  const [isDark, setIsDark] = useState(initialIsDark);
  const [themeMode, setThemeMode] = useState(storedMode || 'system');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const applyThemeMode = useCallback(async (mode) => {
    const nextMode = ['light', 'dark', 'system'].includes(mode) ? mode : 'system';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const targetIsDark = nextMode === 'system' ? prefersDark : nextMode === 'dark';

    setIsTransitioning(true);

    try {
      await themeTransition.transitionTheme(targetIsDark);
      setThemeMode(nextMode);
      if (typeof window !== 'undefined') {
        localStorage.setItem('preferredThemeMode', nextMode);
      }
    } finally {
      setIsTransitioning(false);
    }
  }, []);

  useEffect(() => {
    // Listen for theme changes from the transition utility
    const handleThemeChange = (event) => {
      setIsDark(event.detail.isDark);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const toggleTheme = useCallback(async () => {
    if (isTransitioning) return;
    const nextMode = isDark ? 'light' : 'dark';
    await applyThemeMode(nextMode);
  }, [applyThemeMode, isDark, isTransitioning]);

  const setTheme = useCallback(async (mode) => {
    if (isTransitioning) return;
    await applyThemeMode(mode);
  }, [applyThemeMode, isTransitioning]);

  return (
    <ThemeContext.Provider value={{ 
      isDark, 
      toggleTheme, 
      isTransitioning,
      themeMode,
      theme: themeMode,
      setTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
