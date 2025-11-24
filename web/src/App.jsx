import React from "react";
import Routes from "./Routes";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ToastProvider } from "./contexts/ToastContext";

function App() {
  try {
    return (
      <ToastProvider>
        <ThemeProvider>
          <PreferencesProvider>
            <LanguageProvider>
              <AuthProvider>
                <Routes />
              </AuthProvider>
            </LanguageProvider>
          </PreferencesProvider>
        </ThemeProvider>
      </ToastProvider>
    );
  } catch (error) {
    console.error('Error in App component:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Error in App</h1>
        <pre>{error.message}</pre>
      </div>
    );
  }
}

export default App;
