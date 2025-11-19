import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Backend always runs on port 4000
const getApiBaseUrl = () => {
  if (__DEV__) {
    // Development mode
    if (Platform.OS === 'android') {
      // Android emulator uses 10.0.2.2 to access host machine's localhost
      return 'http://10.0.2.2:4000';
    }
    // iOS simulator and web can use localhost
    return 'http://localhost:4000';
  }
  // Production
  return 'https://api.dentalization.id';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🌐 API Base URL:', API_BASE_URL);

/**
 * Register a new patient
 * @param {Object} registrationData - Patient registration data
 * @returns {Promise<Object>} - Returns accessToken, refreshToken, and user data
 */
export const registerPatient = async (registrationData) => {
  try {
    console.log('📝 Registering patient...', { email: registrationData.email });
    
    const response = await axios.post(
      `${API_BASE_URL}/v1/auth/patient/register`,
      registrationData,
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Registration successful!', { userId: response.data.user?.id });

    // Save tokens to AsyncStorage
    if (response.data.accessToken && response.data.refreshToken) {
      await AsyncStorage.multiSet([
        ['accessToken', response.data.accessToken],
        ['refreshToken', response.data.refreshToken],
        ['user', JSON.stringify(response.data.user)],
      ]);
      console.log('💾 Tokens saved to storage');
    }

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (__DEV__) {
      console.log('⚠️ Registration error details:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
    }
    
    if (error.response) {
      // Server responded with error
      const { status, data } = error.response;
      
      if (status === 400) {
        // Validation error
        return {
          success: false,
          error: 'Validation failed',
          message: data.message || 'Please check your input',
          errors: data.errors || [],
        };
      } else if (status === 409) {
        // Email already exists
        return {
          success: false,
          error: 'Email already registered',
          message: data.message || 'This email is already registered. Please login instead.',
        };
      } else if (status >= 500) {
        // Server error
        return {
          success: false,
          error: 'Server error',
          message: 'Server is having issues. Please try again later.',
        };
      }
    } else if (error.request) {
      // Request made but no response
      return {
        success: false,
        error: 'Network error',
        message: 'Cannot connect to server. Please check your internet connection.',
      };
    }
    
    return {
      success: false,
      error: 'Unknown error',
      message: error.message || 'Something went wrong. Please try again.',
    };
  }
};

/**
 * Login patient
 * @param {string} email - Patient email
 * @param {string} password - Patient password
 * @returns {Promise<Object>} - Returns accessToken, refreshToken, and user data
 */
export const loginPatient = async (email, password) => {
  try {
    console.log('🔐 Logging in patient...', { email });
    
    const response = await axios.post(
      `${API_BASE_URL}/v1/auth/login`,
      { email, password },
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Login successful!', { userId: response.data.user?.id });

    // Save tokens to AsyncStorage
    if (response.data.accessToken && response.data.refreshToken) {
      await AsyncStorage.multiSet([
        ['accessToken', response.data.accessToken],
        ['refreshToken', response.data.refreshToken],
        ['user', JSON.stringify(response.data.user)],
      ]);
      console.log('💾 Tokens saved to storage');
    }

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (__DEV__) {
      console.log('⚠️ Login error details:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
    }
    
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 401) {
        // Invalid credentials
        return {
          success: false,
          error: 'Invalid credentials',
          message: data.message || 'Email or password is incorrect.',
        };
      } else if (status === 404) {
        // User not found
        return {
          success: false,
          error: 'User not found',
          message: 'No account found with this email. Please register first.',
        };
      } else if (status >= 500) {
        return {
          success: false,
          error: 'Server error',
          message: 'Server is having issues. Please try again later.',
        };
      }
    } else if (error.request) {
      return {
        success: false,
        error: 'Network error',
        message: 'Cannot connect to server. Please check your internet connection.',
      };
    }
    
    return {
      success: false,
      error: 'Unknown error',
      message: error.message || 'Something went wrong. Please try again.',
    };
  }
};

/**
 * Logout patient
 */
export const logoutPatient = async () => {
  try {
    console.log('👋 Logging out patient...');
    
    // Clear all stored data
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    
    console.log('✅ Logout successful');
    return { success: true };
  } catch (error) {
    console.error('❌ Logout failed:', error);
    return {
      success: false,
      error: 'Logout failed',
      message: error.message,
    };
  }
};

/**
 * Get current user from storage
 */
export const getCurrentUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      return JSON.parse(userJson);
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async () => {
  try {
    const accessToken = await AsyncStorage.getItem('accessToken');
    return !!accessToken;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};
