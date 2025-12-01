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

const DEFAULT_CLOUD_AI_URL = 'https://api.dentalization.id/api/v1';

// Auto-detect environment
const isSimulator = Constants.isDevice === false;

// Shared extra config (Expo)
const expoExtra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

const envBackendUrl =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  expoExtra.backendApiUrl;

const envAiUrl =
  process.env.EXPO_PUBLIC_AI_URL ||
  process.env.AI_URL ||
  expoExtra.aiApiUrl;

const envAiKey =
  process.env.EXPO_PUBLIC_AI_KEY ||
  process.env.AI_API_KEY ||
  expoExtra.aiApiKey;

const envAiMode =
  process.env.EXPO_PUBLIC_AI_MODE ||
  expoExtra.aiMode;

const shouldUseLocalAi = envAiMode === 'local';
const localBackendUrl = isSimulator
  ? 'http://localhost:3000/api'
  : `http://${LOCAL_IP}:3000/api`;
const localAiUrl = isSimulator
  ? 'http://localhost:8000/api/v1'
  : `http://${LOCAL_IP}:8000/api/v1`;

// API Configuration
export const API_CONFIG = {
  // Backend API (SereneApps backend)
  BACKEND_URL: envBackendUrl
    || localBackendUrl,
  
  // AI Diagnosis API (DeepDental)
  AI_URL: envAiUrl
    || (shouldUseLocalAi
      ? localAiUrl
      : DEFAULT_CLOUD_AI_URL),
  
  AI_API_KEY: envAiKey || 'dd_live_your_api_key_here', // TODO: Move to secure storage
  
  // Timeouts
  TIMEOUT: 30000, // 30 seconds
  AI_TIMEOUT: 180000, // 180 seconds (3 minutes) for AI processing - increased for cloud API
};

// Export individual configs for convenience
export const BACKEND_URL = API_CONFIG.BACKEND_URL;
export const AI_URL = API_CONFIG.AI_URL;
export const AI_API_KEY = API_CONFIG.AI_API_KEY;

// Debug info
if (__DEV__) {
  console.log('📱 API Configuration:');
  console.log('  Environment:', isSimulator ? 'Simulator/Emulator' : 'Physical Device');
  console.log('  isDevice:', Constants.isDevice);
  console.log('  AI Mode:', shouldUseLocalAi ? 'Local (localhost/USB)' : 'Cloud (api.dentalization.id)');
  console.log('  Backend URL:', BACKEND_URL);
  console.log('  AI URL:', AI_URL);
  console.log('  AI Key:', AI_API_KEY ? `${AI_API_KEY.substring(0, 15)}...` : 'NOT SET');
  console.log('  Platform:', Platform.OS);
  console.log('  ---');
  if (shouldUseLocalAi) {
    console.log('  💡 Using LOCAL DeepDental server');
    console.log('  💡 If you get Network Error on simulator, AI server might not be running');
    console.log('  💡 Start AI server: python main.py (port 8000)');
  } else {
    console.log('  💡 Using CLOUD DeepDental server (api.dentalization.id)');
    console.log('  💡 Set EXPO_PUBLIC_AI_MODE=local to switch back to localhost testing');
    if (API_CONFIG.AI_API_KEY === 'dd_live_your_api_key_here') {
      console.warn('  ⚠️  WARNING: Using placeholder API key!');
      console.warn('  ⚠️  You will get 401 errors. Set EXPO_PUBLIC_AI_KEY in .env file');
      console.warn('  ⚠️  See SETUP_API_KEY.md for instructions');
    }
  }
}

export default API_CONFIG;
