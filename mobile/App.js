import 'react-native-gesture-handler';
if (typeof Promise.prototype.finally !== 'function') {
  Promise.prototype.finally = function (callback) {
    const Constructor = this.constructor;
    return this.then(
      value => Constructor.resolve(callback()).then(() => value),
      reason => Constructor.resolve(callback()).then(() => { throw reason; })
    );
  };
}
import React, { useEffect, useRef, useState } from 'react';
import api from './src/services/api';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  LogBox,
  Image,
  Animated,
  Easing,
  Dimensions, // Import tambahan untuk responsivitas
  Platform,
  PixelRatio
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { subscribeAppointmentReminderResponses } from './src/services/pushNotificationService';

// --- UTILS RESPONSIVE (Agar konsisten dengan screen lain) ---
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375; // Base width iPhone 11/Pro

const normalize = (size) => {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
};
// -----------------------------------------------------------

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
    console.log(' App Error:', error);
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

const LoadingSplash = ({ message = 'Menghubungkan ke Serene...' }) => {
  // Animasi Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideUpAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      // Fade In Logo & Teks
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp),
      }),
      // Scale Up Logo (Breathing effect saat muncul)
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp),
      }),
      // Slide Up halus
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={['#0F172A', '#1E1B4B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.loadingContainer}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { translateY: slideUpAnim }],
        }}
      >
        {/* Pure Logo tanpa background card */}
        <Image
          source={require('./assets/icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <Text style={styles.loadingTitle}>Serene App</Text>
        <Text style={styles.loadingSubtitle}>{message}</Text>
      </Animated.View>

      <Animated.View
        style={{
          marginTop: normalize(40),
          opacity: fadeAnim,
          transform: [{ translateY: slideUpAnim }]
        }}
      >
        {/* Clean Loading Indicator */}
        <ActivityIndicator size="large" color="#818CF8" />
      </Animated.View>

      <Animated.View
        style={[
          styles.footer,
          { opacity: fadeAnim }
        ]}
      >
        <Text style={styles.footerText}>Powered by SereneAI</Text>
      </Animated.View>
    </LinearGradient>
  );
};

// BackgroundPresenceConnector removed: @twilio/conversations depends on loglevel
// which defines `default` as a getter-only property. Metro's _interopNamespace
// re-applies that descriptor and then tries to assign namespace.default — which
// throws a fatal Hermes TypeError at module-evaluation time (before any try/catch).
// Twilio is now loaded lazily per-screen only inside TeledentistryScreen.

function AppContent() {
  try {
    const isDarkMode = useSelector((state) => state?.settings?.isDarkMode || false);
    const theme = isDarkMode ? darkTheme : lightTheme;
    const navigationRef = useNavigationContainerRef();

    useEffect(() => {
      const unsubscribe = subscribeAppointmentReminderResponses(navigationRef);
      return unsubscribe;
    }, [navigationRef]);

    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>

          <NavigationContainer ref={navigationRef}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />
            <React.Suspense
              fallback={null} // Fallback null karena Splash ditangani di App level
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
  // State untuk mengontrol durasi splash screen
  const [isMinTimeElapsed, setIsMinTimeElapsed] = useState(false);
  const [isPersistDone, setIsPersistDone] = useState(false);

  // Timer 2.5 detik agar splash screen tampil cukup lama
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMinTimeElapsed(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!store || !persistor) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>⚠️ Store Error</Text>
        <Text style={styles.errorMessage}>Redux store failed to initialize</Text>
      </View>
    );
  }

  // Tampilkan splash jika persist belum selesai ATAU waktu minimal belum lewat
  const showSplash = !isPersistDone || !isMinTimeElapsed;

  return (
    <ErrorBoundary>
      <ReduxProvider store={store}>
        <View style={{ flex: 1 }}>
          <PersistGate
            persistor={persistor}
            onBeforeLift={() => setIsPersistDone(true)}
          >
            <AppContent />
          </PersistGate>

          {/* Overlay Splash Screen: Menjamin animasi tidak terputus dan durasi terjaga */}
          {showSplash && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
              <LoadingSplash message="MENUJU INDONESIA EMAS" />
            </View>
          )}
        </View>
      </ReduxProvider>
    </ErrorBoundary>
  );
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
  // Enhanced Loading Styles (RESPONSIVE APPLIED)
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  logoImage: {
    width: normalize(160), // Menggunakan normalize
    height: normalize(160), // Menggunakan normalize
    marginBottom: normalize(24),
  },
  loadingTitle: {
    fontSize: normalize(28), // Menggunakan normalize
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: normalize(8),
  },
  loadingSubtitle: {
    fontSize: normalize(15), // Menggunakan normalize
    color: '#94A3B8',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  footer: {
    position: 'absolute',
    bottom: normalize(50), // Menggunakan normalize
  },
  footerText: {
    color: '#64748B',
    fontSize: normalize(12), // Menggunakan normalize
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  }
});
