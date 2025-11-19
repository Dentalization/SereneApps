import { authHttp, forceLogout } from '../utils/httpClient';

const API_BASE = '/clinic';

export const staffService = {
  // Get all staff for the current clinic
  getStaff: async () => {
    try {
      console.log('StaffService: Making API call to:', `${API_BASE}/staff`);
      const response = await authHttp.get(`${API_BASE}/staff`);
      console.log('StaffService: API response:', response);
      console.log('StaffService: API response data:', response.data);
      
      // Extract staff array from API response
      const staffData = response.data.staff || response.data || [];
      console.log('StaffService: Extracted staff data:', staffData);
      
      return {
        success: true,
        data: {
          staff: staffData,
          message: response.data.message,
          clinicId: response.data.clinicId
        }
      };
    } catch (error) {
      console.error('StaffService: Error fetching staff:', error);
      console.error('StaffService: Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Include status code in error message for better error handling
      const statusCode = error.response?.status;
      let errorMessage = error.response?.data?.error || error.message || 'Failed to fetch staff list';

      if (statusCode === 401 || statusCode === 403) {
        const errorText = (error.response?.data?.error || error.response?.data?.message || '').toString().toLowerCase();
        if (errorText.includes('token')) {
          forceLogout('Your session has expired. Please log in again.');
        }
      }

      return {
        success: false,
        error: statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage,
        statusCode: statusCode, // Also include status code separately for programmatic handling
        isUnexpectedError: errorMessage.toLowerCase().includes('unexpected')
      };
    }
  },

  // Add new staff member
  addStaff: async (staffData) => {
    try {
      const response = await authHttp.post(`${API_BASE}/staff`, staffData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error adding staff:', error);
      // Include status code in error message for better error handling
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.error || error.message || 'Failed to add staff member';
      if (statusCode === 401 || statusCode === 403) {
        const errorText = (error.response?.data?.error || error.response?.data?.message || '').toString().toLowerCase();
        if (errorText.includes('token')) {
          forceLogout('Your session has expired. Please log in again.');
        }
      }
      
      return {
        success: false,
        error: statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage,
        statusCode: statusCode // Also include status code separately for programmatic handling
      };
    }
  },

  // Update staff member
  updateStaff: async (staffId, updateData) => {
    try {
      console.log('🔄 StaffService.updateStaff called with:', { staffId, updateData });
      const response = await authHttp.put(`${API_BASE}/staff/${staffId}`, updateData);
      console.log('✅ StaffService.updateStaff response:', response);
      console.log('📊 Response data structure:', response.data);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ StaffService.updateStaff error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      // Include status code in error message for better error handling
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update staff member';
      if (statusCode === 401 || statusCode === 403) {
        const errorText = (error.response?.data?.error || error.response?.data?.message || '').toString().toLowerCase();
        if (errorText.includes('token')) {
          forceLogout('Your session has expired. Please log in again.');
        }
      }
      
      return {
        success: false,
        error: statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage,
        statusCode: statusCode // Also include status code separately for programmatic handling
      };
    }
  },

  // Remove staff member (owner only)
  removeStaff: async (staffId) => {
    try {
      const response = await authHttp.delete(`${API_BASE}/staff/${staffId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error removing staff:', error);
      // Include status code in error message for better error handling
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.error || error.message || 'Failed to remove staff member';
      if (statusCode === 401 || statusCode === 403) {
        const errorText = (error.response?.data?.error || error.response?.data?.message || '').toString().toLowerCase();
        if (errorText.includes('token')) {
          forceLogout('Your session has expired. Please log in again.');
        }
      }
      
      return {
        success: false,
        error: statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage,
        statusCode: statusCode // Also include status code separately for programmatic handling
      };
    }
  },

  // Get staff roles and permissions definitions
  getRolesDefinitions: () => {
    return {
      owner: {
        label: 'Owner',
        color: 'bg-purple-100 text-purple-800',
        permissions: ['all'],
        description: 'Full access to all clinic functions'
      },
      manager: {
        label: 'Manager', 
        color: 'bg-blue-100 text-blue-800',
        permissions: ['dashboard', 'schedule', 'patients', 'billing', 'inventory', 'reports', 'settings'],
        description: 'Manage operations and staff'
      },
      front_office: {
        label: 'Front Office',
        color: 'bg-green-100 text-green-800',
        permissions: ['dashboard', 'schedule', 'patients'],
        description: 'Patient registration and appointments'
      },
      nurse: {
        label: 'Nurse',
        color: 'bg-pink-100 text-pink-800',
        permissions: ['dashboard', 'schedule', 'patients', 'inventory'],
        description: 'Clinical support and patient care'
      },
      cashier: {
        label: 'Cashier',
        color: 'bg-yellow-100 text-yellow-800',
        permissions: ['dashboard', 'billing'],
        description: 'Financial transactions and billing'
      },
      staff: {
        label: 'Staff',
        color: 'bg-gray-100 text-gray-800',
        permissions: ['dashboard'],
        description: 'General clinic staff'
      }
    };
  },

  // Get staff member profile
  getStaffProfile: async (userId) => {
    try {
      const response = await authHttp.get(`${API_BASE}/staff/${userId}/profile`);
      return {
        success: true,
        data: response.data.profile
      };
    } catch (error) {
      console.error('Error fetching staff profile:', error);
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch staff profile';
      
      if (statusCode === 401 || statusCode === 403) {
        const errorText = (error.response?.data?.error || error.response?.data?.message || '').toString().toLowerCase();
        if (errorText.includes('token')) {
          forceLogout('Your session has expired. Please log in again.');
        }
      }
      
      return {
        success: false,
        error: statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage,
        statusCode: statusCode
      };
    }
  },

  // Update staff member role and status
  updateStaffRole: async (userId, updates) => {
    try {
      const response = await authHttp.put(`${API_BASE}/staff/${userId}/role`, updates);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error updating staff role:', error);
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update staff member';
      
      if (statusCode === 401 || statusCode === 403) {
        const errorText = (error.response?.data?.error || error.response?.data?.message || '').toString().toLowerCase();
        if (errorText.includes('token')) {
          forceLogout('Your session has expired. Please log in again.');
        }
      }
      
      return {
        success: false,
        error: statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage,
        statusCode: statusCode
      };
    }
  },

  // Remove staff member
  removeStaffMember: async (userId) => {
    try {
      const response = await authHttp.delete(`${API_BASE}/staff/${userId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error removing staff member:', error);
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.error || error.message || 'Failed to remove staff member';
      
      if (statusCode === 401 || statusCode === 403) {
        const errorText = (error.response?.data?.error || error.response?.data?.message || '').toString().toLowerCase();
        if (errorText.includes('token')) {
          forceLogout('Your session has expired. Please log in again.');
        }
      }
      
      return {
        success: false,
        error: statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage,
        statusCode: statusCode
      };
    }
  },

  // Change staff branch assignment
  changeBranch: async (staffId, branchId) => {
    try {
      const response = await authHttp.put(`${API_BASE}/staff/${staffId}`, { branchId });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error changing staff branch:', error);
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.error || error.message || 'Failed to change staff branch';
      
      if (statusCode === 401 || statusCode === 403) {
        const errorText = (error.response?.data?.error || error.response?.data?.message || '').toString().toLowerCase();
        if (errorText.includes('token')) {
          forceLogout('Your session has expired. Please log in again.');
        }
      }
      
      return {
        success: false,
        error: statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage,
        statusCode: statusCode
      };
    }
  },

  // Validate staff data before submission
  validateStaffData: (staffData) => {
    const errors = {};

    if (!staffData.name || staffData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }

    if (!staffData.email || !/\S+@\S+\.\S+/.test(staffData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!staffData.role) {
      errors.role = 'Please select a role';
    }

    const validRoles = ['owner', 'manager', 'front_office', 'nurse', 'cashier'];
    if (staffData.role && !validRoles.includes(staffData.role)) {
      errors.role = 'Invalid role selected';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

export default staffService;
