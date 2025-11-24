import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ActivityIndicator, LogBox } from 'react-native';

// Global error handler
const hasErrorUtils = global?.ErrorUtils?.setGlobalHandler;
if (hasErrorUtils) {
  const originalHandler = global.ErrorUtils.getGlobalHandler?.();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('🔴 Global Error Handler:', error, 'isFatal:', isFatal);
    console.error('🔴 Error stack:', error.stack);

    if (typeof originalHandler === 'function') {
      originalHandler(error, isFatal);
    }
  });
} else {
  console.warn('⚠️ Global Error Utils not available, using console fallback');
}

// Suppress specific warnings
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'Require cycle:',
]);

// Lazy load to catch import errors
const TabNavigator = React.lazy(() => import('./src/navigation/TabNavigator'));

let store, persistor, lightTheme, darkTheme;

try {
  const storeModule = require('./src/store');
  store = storeModule.store;
  persistor = storeModule.persistor;
  console.log('✅ Store loaded successfully');
} catch (error) {
  console.error('❌ Error loading store:', error);
}

try {
  const themeModule = require('./src/theme');
  lightTheme = themeModule.lightTheme;
  darkTheme = themeModule.darkTheme;
  console.log('✅ Theme loaded successfully');
} catch (error) {
  console.error('❌ Error loading theme:', error);
}


// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.log('�� App Error:', error);
    console.log('🔴 Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <Text style={styles.errorStack}>
            {this.state.error?.stack?.substring(0, 500) || ''}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#d32f2f',
  },
  errorMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorStack: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    textAlign: 'left',
    fontFamily: 'monospace',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

function AppContent() {
  try {
    const isDarkMode = useSelector((state) => state?.settings?.isDarkMode || false);
    const theme = isDarkMode ? darkTheme : lightTheme;

    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />
            <React.Suspense
              fallback={
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#0066CC" />
                </View>
              }
            >
              <TabNavigator />
            </React.Suspense>
          </NavigationContainer>
        </SafeAreaProvider>
      </PaperProvider>
    );
  } catch (error) {
    console.error('❌ AppContent error:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>⚠️ App Error</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
      </View>
    );
  }
}

export default function App() {
  if (!store || !persistor) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>⚠️ Store Error</Text>
        <Text style={styles.errorMessage}>Redux store failed to initialize</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ReduxProvider store={store}>
        <PersistGate 
          loading={
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066CC" />
            </View>
          } 
          persistor={persistor}
        >
          <AppContent />
        </PersistGate>
      </ReduxProvider>
    </ErrorBoundary>
  );
}
