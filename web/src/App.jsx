import React from "react";
import Routes from "./Routes";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ToastProvider } from "./contexts/ToastContext";

import { NotificationProvider } from "./contexts/NotificationContext";

const APP_FALLBACK_COPY = {
  en: {
    title: 'Error in App'
  },
  id: {
    title: 'Error pada Aplikasi'
  }
};

const getSavedLanguage = () => {
  try {
    return localStorage.getItem('dentist-portal-language');
  } catch (_) {
    return 'en';
  }
};

function App() {
  return (
    <ThemeProvider>
      <PreferencesProvider>
        <LanguageProvider>
          <ToastProvider>
            <AuthProvider>
              <NotificationProvider>
                <Routes />
              </NotificationProvider>
            </AuthProvider>
          </ToastProvider>
        </LanguageProvider>
      </PreferencesProvider>
    </ThemeProvider>
  );
}

export default App;
