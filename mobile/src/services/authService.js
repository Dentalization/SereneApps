import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './api';

console.log('🌐 API Base URL:', API_BASE_URL);

const OTP_ERROR_MESSAGES = {
  OTP_CHANNEL_DEPRECATED: 'Email OTP sudah tidak didukung. Gunakan OTP via SMS.',
  OTP_INVALID: 'Kode OTP tidak valid. Silakan coba lagi.',
  OTP_EXPIRED: 'Kode OTP sudah kedaluwarsa. Minta kode baru untuk melanjutkan.',
  OTP_LOCKED: 'Terlalu banyak percobaan yang gagal. Silakan coba lagi nanti.',
  OTP_COOLDOWN_ACTIVE: 'Mohon tunggu sejenak sebelum meminta kode OTP lagi.',
  OTP_RATE_LIMITED: 'Terlalu banyak permintaan OTP. Silakan coba lagi nanti.',
  OTP_CHALLENGE_NOT_FOUND: 'Sesi OTP tidak ditemukan. Minta kode baru untuk melanjutkan.',
  OTP_IDENTIFIER_REQUIRED: 'Nomor telepon wajib diisi untuk OTP SMS.',
  NETWORK_ERROR: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
};

const buildRequestHeaders = (idempotencyKey = null) => ({
  'Content-Type': 'application/json',
  'X-Correlation-Id': `otp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
});

const buildOtpIdempotencyKey = (prefix = 'otp-request') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const mapOtpErrorMessage = (code, fallbackMessage) =>
  OTP_ERROR_MESSAGES[code] || fallbackMessage || 'Permintaan OTP gagal diproses.';

const mapOtpErrorResponse = (error) => {
  if (error.response) {
    const { status, data } = error.response;
    const structuredError = data?.error || {};
    const code = structuredError.code || 'OTP_REQUEST_FAILED';

    return {
      success: false,
      status,
      code,
      retryable: structuredError.retryable ?? false,
      correlationId: structuredError.correlationId || null,
      message: mapOtpErrorMessage(code, structuredError.message),
      details: structuredError.details || {},
    };
  }

  if (error.request) {
    return {
      success: false,
      status: 0,
      code: 'NETWORK_ERROR',
      retryable: true,
      correlationId: null,
      message: OTP_ERROR_MESSAGES.NETWORK_ERROR,
      details: {},
    };
  }

  return {
    success: false,
    status: 0,
    code: 'OTP_UNKNOWN_ERROR',
    retryable: false,
    correlationId: null,
    message: error.message || 'Terjadi kesalahan tidak terduga saat memproses OTP.',
    details: {},
  };
};

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
 * Request OTP via SMS using the new /v1/otp/* contract.
 */
export const requestSmsOtp = async ({
  phoneNumber,
  purpose = 'login',
  idempotencyKey = buildOtpIdempotencyKey('otp-request'),
} = {}) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/v1/otp/requests`,
      {
        channel: 'sms',
        phone_number: phoneNumber,
        purpose,
      },
      {
        timeout: 15000,
        headers: buildRequestHeaders(idempotencyKey),
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return mapOtpErrorResponse(error);
  }
};

/**
 * Resend OTP via SMS using the current challenge.
 */
export const resendSmsOtp = async ({
  challengeId,
  idempotencyKey = buildOtpIdempotencyKey('otp-resend'),
} = {}) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/v1/otp/requests/${challengeId}/resend`,
      {},
      {
        timeout: 15000,
        headers: buildRequestHeaders(idempotencyKey),
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return mapOtpErrorResponse(error);
  }
};

/**
 * Verify SMS OTP using the new /v1/otp/verifications contract.
 */
export const verifySmsOtp = async ({
  phoneNumber,
  otp,
} = {}) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/v1/otp/verifications`,
      {
        channel: 'sms',
        phone_number: phoneNumber,
        otp,
      },
      {
        timeout: 15000,
        headers: buildRequestHeaders(),
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return mapOtpErrorResponse(error);
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
