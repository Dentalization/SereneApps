import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';

// Inject TextEncoder and TextDecoder into global scope to prevent Twilio Sync binary decoding crash
const TextEncodingPolyfill = require('text-encoding');
global.TextEncoder = TextEncodingPolyfill.TextEncoder;
global.TextDecoder = TextEncodingPolyfill.TextDecoder;

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
import { NativeModules } from 'react-native';
import { AppState } from 'react-native';
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
import { NotificationProvider } from './src/contexts/NotificationContext';

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
    // Suppress non-fatal Twilio SDK internal errors — these are expected
    // when Twilio is in mock mode or the token is invalid.
    const msg = error?.message || '';
    const isTwilioInternalError =
      msg.includes('Maximum call stack size exceeded') ||
      msg.includes('Object is not a constructor') ||
      msg.includes('myConversationsRead') ||
      msg.includes('Invalid Access Token') ||
      msg.includes('Twilio');

    if (isTwilioInternalError && !isFatal) {
      return; // Swallow silently — handled by useChat REST fallback
    }

    if (__DEV__) {
      console.error('🔴 Global Error Handler:', error, 'isFatal:', isFatal);
    }

    if (typeof originalHandler === 'function') {
      originalHandler(error, isFatal);
    }
  });
} else if (__DEV__) {
  console.warn('⚠️ Global Error Utils not available, using console fallback');
}

// DEV-only: log unhandled rejections that are NOT Twilio-related
if (__DEV__) {
  const oldConsoleError = console.error;
  console.error = (...args) => {
    oldConsoleError(...args);
    const msg = String(args?.[0] || '');
    if (msg.includes('Unhandled promise rejection')) {
      const detail = String(args?.[1] || '');
      const isTwilioNoise =
        detail.includes('Maximum call stack size exceeded') ||
        detail.includes('Object is not a constructor') ||
        detail.includes('myConversationsRead') ||
        detail.includes('Invalid Access Token');
      if (!isTwilioNoise) {
        console.log('🔥 UNHANDLED REJECTION FULL:', args);
      }
    }
  };
}

// Suppress specific warnings
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'Require cycle:',
  // Twilio SDK internal errors — expected when using mock/invalid tokens
  'Unhandled promise rejection',
  'Maximum call stack size exceeded',
  'Object is not a constructor',
  'myConversationsRead',
  'Invalid Access Token',
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

import { getOrCreateTwilioClient, shutdownGlobalTwilioClient, getGlobalTwilioClient, getTeledentistryScreenActive } from './src/hooks/useChat';
import { getAppointments } from './src/services/appointmentService';

function BackgroundPresenceConnector() {
  const user = useSelector((state) => state?.auth?.user);
  const accessToken = useSelector((state) => state?.auth?.accessToken);

  useEffect(() => {
    if (!user || !accessToken) {
      shutdownGlobalTwilioClient();
      return;
    }

    let active = true;
    const connectPresence = async () => {
      if (getTeledentistryScreenActive()) {
        console.log('[BackgroundPresenceConnector] Teledentistry screen is active, skipping background client setup.');
        return;
      }
      try {
        const result = await getAppointments({ limit: 10 });
        if (!active) return;
        const list = result?.data || [];

        // Find any upcoming/confirmed virtual appointment
        const upcomingVirtual = list.find(apt => {
          const isVirtual = apt.appointmentType === 'virtual' || apt.metadata?.appointmentType === 'virtual' || Boolean(apt.videoRoomRef);
          const isConfirmed = apt.status === 'confirmed' || apt.status === 'scheduled';
          const isUnpaid = apt.fee > 0 &&
            apt.payment?.status !== 'succeeded' &&
            apt.payment?.status !== 'settlement' &&
            apt.payment?.status !== 'capture' &&
            apt.status !== 'cancelled';
          // Must be paid, virtual, and active/upcoming
          return isVirtual && isConfirmed && !isUnpaid;
        });

        if (upcomingVirtual) {
          console.log('[BackgroundPresenceConnector] Active virtual appointment found:', upcomingVirtual.id);
          if (getGlobalTwilioClient()) {
            console.log('[BackgroundPresenceConnector] Twilio client already exists, skipping initialization.');
            return;
          }
          const { data } = await api.get(`/communications/appointments/${upcomingVirtual.id}/token`);
          const token = data.chat?.token || data.token;
          if (token && active) {
            if (getGlobalTwilioClient()) {
              console.log('[BackgroundPresenceConnector] Twilio client was initialized concurrently, skipping.');
              return;
            }
            await getOrCreateTwilioClient(token);
            console.log('[BackgroundPresenceConnector] Background Twilio Client connected successfully');
          }
        } else {
          console.log('[BackgroundPresenceConnector] No active virtual appointments found, shutting down Twilio client.');
          shutdownGlobalTwilioClient();
        }
      } catch (err) {
        console.warn('[BackgroundPresenceConnector] Error setting up presence:', err.message);
      }
    };

    connectPresence();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && active) {
        connectPresence();
      }
    });

    return () => {
      active = false;
      subscription.remove();
      shutdownGlobalTwilioClient();
    };
  }, [user, accessToken]);

  return null;
}

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
          <NotificationProvider>
            <BackgroundPresenceConnector />
            <NavigationContainer ref={navigationRef}>
              <StatusBar style={isDarkMode ? 'light' : 'dark'} />
              <React.Suspense
                fallback={null} // Fallback null karena Splash ditangani di App level
              >
                <TabNavigator />
              </React.Suspense>
            </NavigationContainer>
          </NotificationProvider>
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
