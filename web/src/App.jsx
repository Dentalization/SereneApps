import React from "react";
import Routes from "./Routes";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ToastProvider } from "./contexts/ToastContext";

function App() {
  console.log('App component rendering...'); // Debug log
  
  try {
    return (
      <ThemeProvider>
        <PreferencesProvider>
          <LanguageProvider>
            <AuthProvider>
              <ToastProvider>
                <Routes />
              </ToastProvider>
            </AuthProvider>
          </LanguageProvider>
        </PreferencesProvider>
      </ThemeProvider>
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
