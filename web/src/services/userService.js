import { authHttp } from '../utils/httpClient';

export const userService = {
  // Get user profile
  getProfile: async () => {
    try {
      const response = await authHttp.get('/auth/user/profile');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch profile'
      };
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await authHttp.put('/auth/user/profile', profileData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update profile'
      };
    }
  },

  // Change password
  changePassword: async (passwordData) => {
    try {
      const response = await authHttp.put('/auth/user/password', passwordData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error changing password:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to change password'
      };
    }
  },

  // Upload avatar
  uploadAvatar: async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await authHttp.post('/auth/user/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to upload avatar'
      };
    }
  },

  // Upload documents (for dentists)
  uploadDocuments: async (documents) => {
    try {
      const formData = new FormData();
      
      if (documents.sipFile) formData.append('sipFile', documents.sipFile);
      if (documents.strFile) formData.append('strFile', documents.strFile);
      if (documents.ijazahFiles) {
        documents.ijazahFiles.forEach(file => formData.append('ijazahFiles', file));
      }
      if (documents.certificationFiles) {
        documents.certificationFiles.forEach(file => formData.append('certificationFiles', file));
      }

      const response = await authHttp.post('/auth/user/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error uploading documents:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to upload documents'
      };
    }
  }
};

export default userService;