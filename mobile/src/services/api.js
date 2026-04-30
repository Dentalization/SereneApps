import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

const ENV_API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || process.env.API_BASE_URL;

// Detect the correct API base URL based on platform
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

  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/https?:\/\/([^:]+)/);
    if (match?.[1] && match[1] !== 'localhost') {
      return match[1];
    }
  }

  return null;
};

const buildDevBaseUrl = () => {
  if (ENV_API_BASE_URL) {
    return ENV_API_BASE_URL;
  }

  const host = guessExpoHost();
  if (host) {
    return `http://${host}:4000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000';
  }

  return 'http://localhost:4000';
};

export const resolveApiBaseUrl = () => {
  if (__DEV__) {
    return buildDevBaseUrl();
  }

  if (ENV_API_BASE_URL) {
    return ENV_API_BASE_URL;
  }

  return 'https://api.dentalization.id';
};

export const API_BASE_URL = resolveApiBaseUrl();
export const API_VERSION = 'v1';

console.log('🌐 [API] Using base URL:', API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/${API_VERSION}`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('[API] Auth token attached to request:', config.url);
      } else {
        console.log('[API] No token found for request:', config.url);
      }
    } catch (error) {
      console.error('[API] Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const errorMsg = error.response?.data?.error || '';

    // Handle token expiration - both 401 and 403 with "Invalid or expired token"
    const isTokenExpired = 
      status === 401 || 
      (status === 403 && errorMsg.includes('expired'));

    if (isTokenExpired && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('[API] Token expired, attempting refresh...');

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          console.log('[API] Refreshing token...');
          const response = await axios.post(`${API_BASE_URL}/${API_VERSION}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          await AsyncStorage.setItem('accessToken', accessToken);
          console.log('[API] Token refreshed successfully');

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } else {
          console.log('[API] No refresh token available');
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        console.log('[API] Token refresh failed, clearing tokens');
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
