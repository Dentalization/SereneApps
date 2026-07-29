import { authHttp, forceLogout } from '../utils/httpClient';
import { publishPortalInvalidation } from '../collaboration/portalCollaboration.mjs';

const API_BASE = '/clinic';

export const staffService = {
  // Get all staff for the current clinic
  getStaff: async () => {
    try {
      const response = await authHttp.get(`${API_BASE}/staff`);
      
      // Extract staff array from API response
      const staffData = response.data.staff || response.data || [];
      return {
        success: true,
        data: {
          staff: staffData,
          message: response.data.message,
          clinicId: response.data.clinicId,
          stats: response.data.stats || null
        }
      };
    } catch (error) {
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
      publishPortalInvalidation('clinic:staff_updated', { source: 'staff-service:add' });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
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
        statusCode: statusCode, // Also include status code separately for programmatic handling
        errorCode: error.response?.data?.errorCode,
        details: error.response?.data?.details
      };
    }
  },

  // Update staff member
  updateStaff: async (staffId, updateData) => {
    try {
      const response = await authHttp.put(`${API_BASE}/staff/${staffId}`, updateData);
      publishPortalInvalidation('clinic:staff_updated', { source: 'staff-service:update' });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
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
      publishPortalInvalidation('clinic:staff_updated', { source: 'staff-service:remove' });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
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
      publishPortalInvalidation('clinic:staff_updated', { source: 'staff-service:role' });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
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
      publishPortalInvalidation('clinic:staff_updated', { source: 'staff-service:remove' });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
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
      publishPortalInvalidation('clinic:staff_updated', { source: 'staff-service:branch' });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
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
