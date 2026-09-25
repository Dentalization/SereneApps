/**
 * API Configuration for SereneAI Mobile App
 * 
 * IMPORTANT FOR DEVICE TESTING:
 * - Emulator/Simulator: Use 'localhost' or emulator-specific URLs
 * - Physical Device: Use your computer's LOCAL IP address
 * 
 * How to find your local IP:
 * - macOS: System Preferences → Network OR run `ifconfig | grep "inet " | grep -v 127.0.0.1`
 * - Windows: Run `ipconfig` and look for IPv4 Address
 * - Linux: Run `hostname -I` or `ip addr show`
 * 
 * Make sure your phone and computer are on the SAME WiFi network!
 */

// Determine if we're on simulator/emulator or physical device
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Default LAN IP fallback when offline or untracked
const LOCAL_IP = '10.40.36.133'; // Active computer LAN IP

// Auto-detect host from active Expo Metro bundler
const guessExpoHost = () => {
  const hostCandidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoConfig?.debuggerHost,
    Constants.expoGoConfig?.debuggerHost,
    Constants.manifest?.hostUri,
    Constants.manifest?.debuggerHost,
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
  ].filter(Boolean);

  for (const candidate of hostCandidates) {
    const host = candidate.split(':')[0];
    if (host && host !== 'localhost') {
      return host;
    }
  }
  return null;
};

const detectedHost = guessExpoHost();
const ACTIVE_IP = detectedHost || LOCAL_IP;

// Auto-detect environment (compatible with modern Expo SDK 54 where Constants.isDevice is deprecated)
const isSimulator =
  Constants.isDevice === false ||
  Constants.deviceName?.toLowerCase?.().includes('simulator') ||
  Platform.constants?.isTesting === true;

// Shared extra config (Expo)
const expoExtra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

const envBackendUrl =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  expoExtra.backendApiUrl;

const envAiUrl =
  process.env.EXPO_PUBLIC_AI_PROXY_URL ||
  expoExtra.aiProxyUrl;

const localBackendUrl = isSimulator && Platform.OS === 'ios'
  ? 'http://localhost:4000/api'
  : `http://${ACTIVE_IP}:4000/api`;

const resolveBackendUrl = () => {
  if (detectedHost && (!envBackendUrl || /^(https?:\/\/)?(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(envBackendUrl))) {
    return isSimulator && Platform.OS === 'ios'
      ? 'http://localhost:4000/api'
      : `http://${detectedHost}:4000/api`;
  }
  return envBackendUrl || localBackendUrl;
};

// API Configuration
export const API_CONFIG = {
  // Backend API (SereneApps backend)
  BACKEND_URL: resolveBackendUrl(),
  
  // AI diagnosis must use the Serene backend proxy. Service credentials are
  // intentionally never embedded in the mobile bundle.
  AI_URL: envAiUrl || null,
  
  // Timeouts
  TIMEOUT: 30000, // 30 seconds
  AI_TIMEOUT: 240000, // 240 seconds (4 minutes) for AI processing - increased for cloud API with cold start
};

// Export individual configs for convenience
export const BACKEND_URL = API_CONFIG.BACKEND_URL;
export const AI_URL = API_CONFIG.AI_URL;

// Debug info
if (__DEV__) {
  console.log('📱 API Configuration:');
  console.log('  Environment:', isSimulator ? 'Simulator/Emulator' : 'Physical Device');
  console.log('  isDevice:', Constants.isDevice);
  console.log('  AI Mode: Authenticated Serene backend proxy');
  console.log('  Backend URL:', BACKEND_URL);
  console.log('  AI URL:', AI_URL);
  console.log('  Platform:', Platform.OS);
  console.log('  ---');
  console.log('  💡 AI requests are routed through the authenticated Serene backend proxy');
}

export default API_CONFIG;
