import httpClient from '../utils/httpClient';
import { publishPortalInvalidation } from '../collaboration/portalCollaboration.mjs';

class ClinicService {
  // Create clinic profile (Admin only)
  async createClinic(clinicData, files) {
    const formData = new FormData();

    // Add text fields
    Object.keys(clinicData).forEach(key => {
      if (clinicData[key] !== null && clinicData[key] !== undefined) {
        if (typeof clinicData[key] === 'object') {
          formData.append(key, JSON.stringify(clinicData[key]));
        } else {
          formData.append(key, clinicData[key]);
        }
      }
    });

    // Add files
    if (files) {
      Object.keys(files).forEach(fileKey => {
        if (files[fileKey]) {
          if (Array.isArray(files[fileKey])) {
            files[fileKey].forEach(file => {
              formData.append(fileKey, file);
            });
          } else {
            formData.append(fileKey, files[fileKey]);
          }
        }
      });
    }

    const response = await httpClient.post('/clinic/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  // Get clinic profile
  async getClinicProfile() {
    const response = await httpClient.get('/clinic/profile');
    return response.data;
  }

  // Update clinic profile
  async updateClinicProfile(clinicData, files = null) {
    const formData = new FormData();

    // Add text fields
    Object.keys(clinicData).forEach(key => {
      if (clinicData[key] !== null && clinicData[key] !== undefined) {
        if (typeof clinicData[key] === 'object') {
          formData.append(key, JSON.stringify(clinicData[key]));
        } else {
          formData.append(key, clinicData[key]);
        }
      }
    });

    // Add files if provided
    if (files) {
      Object.keys(files).forEach(fileKey => {
        if (files[fileKey]) {
          if (Array.isArray(files[fileKey])) {
            files[fileKey].forEach(file => {
              formData.append(fileKey, file);
            });
          } else {
            formData.append(fileKey, files[fileKey]);
          }
        }
      });
    }

    const response = await httpClient.put('/clinic/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    publishPortalInvalidation('clinic:profile_updated', { source: 'clinic-service:update-profile' });

    return response.data;
  }

  // Admin: Get clinic list
  async getClinicList(params = {}) {
    const response = await httpClient.get('/clinic/admin/list', { params });
    return response.data;
  }

  // Admin: Verify clinic
  async verifyClinic(clinicId, status, verificationNotes = '') {
    const response = await httpClient.put(`/clinic/admin/${clinicId}/verify`, {
      status,
      verificationNotes
    });
    return response.data;
  }

  // Branch management
  async getBranches() {
    const response = await httpClient.get('/clinic/branches');
    return response.data;
  }

  async createBranch(branchData) {
    const response = await httpClient.post('/clinic/branches', branchData);
    publishPortalInvalidation('clinic:branches_updated', { source: 'clinic-service:create-branch' });
    return response.data;
  }

  async updateBranch(branchId, branchData) {
    const response = await httpClient.put(`/clinic/branches/${branchId}`, branchData);
    publishPortalInvalidation('clinic:branches_updated', { source: 'clinic-service:update-branch' });
    return response.data;
  }

  async deleteBranch(branchId) {
    const response = await httpClient.delete(`/clinic/branches/${branchId}`);
    publishPortalInvalidation('clinic:branches_updated', { source: 'clinic-service:delete-branch' });
    return response.data;
  }

  // Clinic patients (all patients who have had appointments with clinic dentists)
  async getClinicPatients() {
    const response = await httpClient.get('/clinic/patients');
    return response.data;
  }

  // Clinic staff list
  async getClinicStaffList() {
    const response = await httpClient.get('/clinic/staff');
    return response.data;
  }

  // Utility methods
  generateOperatingHours() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const defaultHours = {};

    days.forEach(day => {
      defaultHours[day] = {
        isOpen: day !== 'sunday', // Default: closed on Sunday
        open: '08:00',
        close: '17:00'
      };
    });

    return defaultHours;
  }

  validateClinicData(clinicData) {
    const errors = [];

    // Required fields validation
    const requiredFields = [
      'legalName', 'facilityType', 'streetAddress', 'city', 'province',
      'postalCode', 'phone', 'email', 'ownerName', 'ownerPosition',
      'ownerEmail', 'ownerWhatsapp', 'ownerNik', 'nibNumber', 'npwpNumber'
    ];

    requiredFields.forEach(field => {
      if (!clinicData[field] || clinicData[field].toString().trim() === '') {
        errors.push(`${field} is required`);
      }
    });

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (clinicData.email && !emailRegex.test(clinicData.email)) {
      errors.push('Invalid email format');
    }
    if (clinicData.ownerEmail && !emailRegex.test(clinicData.ownerEmail)) {
      errors.push('Invalid owner email format');
    }

    // Phone validation (Indonesian format)
    const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
    if (clinicData.phone && !phoneRegex.test(clinicData.phone.replace(/[\s-]/g, ''))) {
      errors.push('Invalid phone number format');
    }
    if (clinicData.ownerWhatsapp && !phoneRegex.test(clinicData.ownerWhatsapp.replace(/[\s-]/g, ''))) {
      errors.push('Invalid WhatsApp number format');
    }

    // NIK validation (16 digits)
    if (clinicData.ownerNik && !/^\d{16}$/.test(clinicData.ownerNik)) {
      errors.push('NIK must be 16 digits');
    }

    // Postal code validation (5 digits)
    if (clinicData.postalCode && !/^\d{5}$/.test(clinicData.postalCode)) {
      errors.push('Postal code must be 5 digits');
    }

    return errors;
  }

  validateFiles(files) {
    const errors = [];
    const requiredFiles = ['ktpFile', 'nibFile', 'npwpFile', 'operationalLicense'];

    requiredFiles.forEach(fileKey => {
      if (!files[fileKey]) {
        errors.push(`${fileKey} is required`);
      }
    });

    // File size validation (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    Object.keys(files).forEach(fileKey => {
      const file = files[fileKey];
      if (file && file.size > maxSize) {
        errors.push(`${fileKey} must be less than 10MB`);
      }
    });

    // File type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    Object.keys(files).forEach(fileKey => {
      const file = files[fileKey];
      if (file && !allowedTypes.includes(file.type)) {
        errors.push(`${fileKey} must be JPEG, PNG, or PDF`);
      }
    });

    return errors;
  }

  // Format display data
  formatClinicForDisplay(clinic) {
    return {
      ...clinic,
      displayName: clinic.brandName || clinic.legalName,
      facilityTypeText: clinic.facilityType === 'klinik_gigi' ? 'Klinik Gigi' : 'RSGM',
      ownerPositionText: clinic.ownerPosition === 'owner' ? 'Owner' : 'Manager',
      statusText: this.getStatusText(clinic.status),
      statusColor: this.getStatusColor(clinic.status),
      branchCount: clinic.branches?.length || 0,
      mainBranch: clinic.branches?.find(b => b.isMainBranch) || clinic.branches?.[0]
    };
  }

  getStatusText(status) {
    const statusMap = {
      'pending': 'Menunggu Verifikasi',
      'verified': 'Terverifikasi',
      'rejected': 'Ditolak',
      'suspended': 'Suspended'
    };
    return statusMap[status] || status;
  }

  getStatusColor(status) {
    const colorMap = {
      'pending': 'yellow',
      'verified': 'green',
      'rejected': 'red',
      'suspended': 'gray'
    };
    return colorMap[status] || 'gray';
  }

}

export default new ClinicService();
