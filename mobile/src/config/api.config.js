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

// Change this to your computer's local IP when testing on physical device
const LOCAL_IP = '192.168.1.12'; // Auto-detected by setup script

// Auto-detect environment
const isSimulator = Constants.isDevice === false;

// Shared extra config (Expo)
const expoExtra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

const envBackendUrl =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  expoExtra.backendApiUrl;

const envAiUrl =
  process.env.EXPO_PUBLIC_AI_PROXY_URL ||
  expoExtra.aiProxyUrl;

const localBackendUrl = isSimulator
  ? 'http://localhost:3000/api'
  : `http://${LOCAL_IP}:3000/api`;

// API Configuration
export const API_CONFIG = {
  // Backend API (SereneApps backend)
  BACKEND_URL: envBackendUrl
    || localBackendUrl,
  
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
