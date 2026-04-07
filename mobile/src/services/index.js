import api from './api';
import { requestSmsOtp, resendSmsOtp, verifySmsOtp } from './authService';

export const authService = {
  // Patient registration
  register: async (data) => {
    const response = await api.post('/auth/patient/register', data);
    return response.data;
  },

  // Login
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  // Send OTP
  sendOTP: async (phoneNumber, options = {}) => {
    const result = await requestSmsOtp({
      phoneNumber,
      purpose: options.purpose || 'login',
      idempotencyKey: options.idempotencyKey || null,
    });

    if (!result.success) {
      throw Object.assign(new Error(result.message), result);
    }

    return result.data;
  },

  // Verify OTP
  verifyOTP: async (phoneNumber, code) => {
    const result = await verifySmsOtp({ phoneNumber, otp: code });

    if (!result.success) {
      throw Object.assign(new Error(result.message), result);
    }

    return result.data;
  },

  // Resend OTP
  resendOTP: async (challengeId, options = {}) => {
    const result = await resendSmsOtp({
      challengeId,
      idempotencyKey: options.idempotencyKey || null,
    });

    if (!result.success) {
      throw Object.assign(new Error(result.message), result);
    }

    return result.data;
  },

  // Logout
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await api.get('/mobile/profile');
    return response.data;
  },

  // Update profile
  updateProfile: async (data) => {
    const response = await api.put('/mobile/profile', data);
    return response.data;
  },
};

export const appointmentService = {
  // Get appointments
  getAppointments: async (params = {}) => {
    const response = await api.get('/mobile/appointments', { params });
    return response.data;
  },

  // Create appointment
  createAppointment: async (data) => {
    const response = await api.post('/mobile/appointments', data);
    return response.data;
  },

  // Get appointment by ID
  getAppointment: async (id) => {
    const response = await api.get(`/mobile/appointments/${id}`);
    return response.data;
  },

  // Update appointment
  updateAppointment: async (id, data) => {
    const response = await api.put(`/mobile/appointments/${id}`, data);
    return response.data;
  },

  // Cancel appointment
  cancelAppointment: async (id) => {
    const response = await api.post(`/mobile/appointments/${id}/cancel`);
    return response.data;
  },
};

export const clinicService = {
  // Get clinics
  getClinics: async (params = {}) => {
    const response = await api.get('/mobile/clinics', { params });
    return response.data;
  },

  // Get clinic by ID
  getClinic: async (id) => {
    const response = await api.get(`/mobile/clinics/${id}`);
    return response.data;
  },

  // Get clinic dentists
  getClinicDentists: async (clinicId) => {
    const response = await api.get(`/mobile/clinics/${clinicId}/dentists`);
    return response.data;
  },
};

export const dentistService = {
  // Get dentist by ID
  getDentist: async (id) => {
    const response = await api.get(`/mobile/dentists/${id}`);
    return response.data;
  },

  // Get dentist availability
  getAvailability: async (dentistId, date) => {
    const response = await api.get(`/mobile/dentists/${dentistId}/availability`, {
      params: { date },
    });
    return response.data;
  },

  // Get dentist reviews
  getReviews: async (dentistId) => {
    const response = await api.get(`/mobile/dentists/${dentistId}/reviews`);
    return response.data;
  },
};

export const aiService = {
  // Upload image
  uploadImage: async (formData) => {
    const response = await api.post('/mobile/ai-diagnosis/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Analyze images
  analyzeImages: async (imageIds) => {
    const response = await api.post('/mobile/ai-diagnosis/analyze', { imageIds });
    return response.data;
  },

  // Get diagnosis history
  getHistory: async (params = {}) => {
    const response = await api.get('/mobile/ai-diagnosis/history', { params });
    return response.data;
  },

  // Get diagnosis by ID
  getDiagnosis: async (id) => {
    const response = await api.get(`/mobile/ai-diagnosis/${id}`);
    return response.data;
  },

  // Delete diagnosis
  deleteDiagnosis: async (id) => {
    const response = await api.delete(`/mobile/ai-diagnosis/${id}`);
    return response.data;
  },
};

export const productService = {
  // Get products
  getProducts: async (params = {}) => {
    const response = await api.get('/mobile/products', { params });
    return response.data;
  },

  // Get product by ID
  getProduct: async (id) => {
    const response = await api.get(`/mobile/products/${id}`);
    return response.data;
  },

  // Get categories
  getCategories: async () => {
    const response = await api.get('/mobile/categories');
    return response.data;
  },
};

export const orderService = {
  // Create order
  createOrder: async (data) => {
    const response = await api.post('/mobile/orders', data);
    return response.data;
  },

  // Get orders
  getOrders: async (params = {}) => {
    const response = await api.get('/mobile/orders', { params });
    return response.data;
  },

  // Get order by ID
  getOrder: async (id) => {
    const response = await api.get(`/mobile/orders/${id}`);
    return response.data;
  },
};
