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

/**
 * Get access token from storage
 */
const getAccessToken = async () => {
  try {
    return await AsyncStorage.getItem('accessToken');
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};

/**
 * Transform camelCase profile data to snake_case for backend
 */
const transformToBackendFormat = (profileData) => {
  const transformed = { ...profileData };
  
  // Transform address fields
  if (transformed.address) {
    const { postalCode, ...restAddress } = transformed.address;
    transformed.address = {
      ...restAddress,
      postal_code: postalCode, // postalCode → postal_code
    };
  }
  
  // Transform medical_details fields
  if (transformed.medical_details) {
    const { medications, chronicConditions, ...restMedical } = transformed.medical_details;
    transformed.medical_details = {
      ...restMedical,
      current_medications: medications, // medications → current_medications
      medical_conditions: chronicConditions, // chronicConditions → medical_conditions
    };
  }
  
  return transformed;
};

/**
 * Get patient profile
 * @returns {Promise<Object>} - Returns patient profile data
 */
export const getPatientProfile = async () => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('No access token found');
    }

    if (__DEV__) {
      console.log('🔍 Fetching patient profile...');
    }

    const response = await axios.get(
      `${API_BASE_URL}/v1/patient/profile`,
      {
        timeout: 15000,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (__DEV__) {
      console.log('✅ Patient profile fetched successfully!');
      console.log('📦 Response structure:', JSON.stringify(response.data, null, 2));
    }

    // Backend returns: { status: 'success', data: { user: {...}, profile: {...} } }
    const responseData = response.data.data || response.data;
    
    // Backend already returns camelCase, just extract profile
    const profile = responseData.profile || {};
    
    if (__DEV__) {
      console.log('📋 Extracted profile:', profile);
    }

    return {
      success: true,
      data: profile, // Return profile as-is (already in correct format)
    };
  } catch (error) {
    if (__DEV__) {
      console.log('⚠️ Get patient profile error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
    }
    
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 401 || status === 403) {
        return {
          success: false,
          error: 'Unauthorized',
          message: 'Token invalid atau kadaluarsa. Silakan login ulang.',
          needsReauth: true,
        };
      } else if (status === 404) {
        return {
          success: false,
          error: 'Profile not found',
          message: 'Profil pasien belum dibuat.',
          profileNotFound: true,
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
 * Update patient profile
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} - Returns updated profile data
 */
export const updatePatientProfile = async (profileData) => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('No access token found');
    }

    // Transform camelCase to snake_case for backend
    const backendData = transformToBackendFormat(profileData);

    if (__DEV__) {
      console.log('🔑 Access Token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NULL');
      console.log('📤 Updating patient profile (after transform):', backendData);
    }

    const response = await axios.put(
      `${API_BASE_URL}/v1/patient/profile`,
      backendData, // Use transformed data
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    console.log('✅ Profile updated successfully!');

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (__DEV__) {
      console.log('⚠️ Profile update error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
    }
    
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 401 || status === 403) {
        return {
          success: false,
          error: 'Unauthorized',
          message: 'Token invalid atau kadaluarsa. Silakan login ulang.',
          needsReauth: true,
        };
      } else if (status === 400) {
        return {
          success: false,
          error: 'Validation failed',
          message: data.message || 'Invalid data provided.',
        };
      } else if (status === 404) {
        return {
          success: false,
          error: 'Endpoint not found',
          message: 'Backend endpoint belum diimplementasikan. PUT /v1/patient/profile tidak ditemukan.',
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
 * Upload patient avatar
 * @param {Object} avatarFile - Avatar file to upload { uri, name, type }
 * @returns {Promise<Object>} - Returns avatar URL
 */
export const uploadPatientAvatar = async (avatarFile) => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('No access token found');
    }

    console.log('� Access Token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NULL');
    console.log('�📤 Uploading avatar...', avatarFile.name);

    const formData = new FormData();
    formData.append('avatar', {
      uri: Platform.OS === 'ios' ? avatarFile.uri.replace('file://', '') : avatarFile.uri,
      type: avatarFile.type,
      name: avatarFile.name,
    });

    const response = await axios.post(
      `${API_BASE_URL}/v1/patient/avatar`,
      formData,
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    console.log('✅ Avatar uploaded successfully!', response.data?.data?.avatar_url);
    
    // Backend returns: { status: 'success', message: '...', data: { avatar_url: '/uploads/avatars/xxx.jpg' } }
    return {
      success: true,
      data: response.data.data, // Extract nested data object
      avatarUrl: response.data.data?.avatar_url, // Direct access to avatar_url
    };
  } catch (error) {
    if (__DEV__) {
      console.log('⚠️ Avatar upload error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
    }
    
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 401 || status === 403) {
        return {
          success: false,
          error: 'Unauthorized',
          message: 'Token invalid atau kadaluarsa. Silakan login ulang.',
          needsReauth: true,
        };
      } else if (status === 400) {
        return {
          success: false,
          error: 'Validation failed',
          message: data.message || 'Invalid file provided.',
        };
      } else if (status === 404) {
        return {
          success: false,
          error: 'Endpoint not found',
          message: 'Backend endpoint belum diimplementasikan. POST /v1/patient/avatar tidak ditemukan.',
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
