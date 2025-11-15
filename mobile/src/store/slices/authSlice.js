import { createSlice } from '@reduxjs/toolkit';

const AUTH_LEVELS = {
  GUEST: 'guest',
  OTP_VERIFIED: 'otp_verified',
  FULL_ACCOUNT: 'full_account',
};

const initialState = {
  authLevel: AUTH_LEVELS.GUEST,
  user: null,
  patientProfile: null,
  accessToken: null,
  refreshToken: null,
  phoneNumber: null, // For OTP verification
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthLevel: (state, action) => {
      state.authLevel = action.payload;
    },
    setPhoneNumber: (state, action) => {
      state.phoneNumber = action.payload;
    },
    otpVerified: (state, action) => {
      state.authLevel = AUTH_LEVELS.OTP_VERIFIED;
      state.phoneNumber = action.payload.phoneNumber;
    },
    loginSuccess: (state, action) => {
      state.authLevel = AUTH_LEVELS.FULL_ACCOUNT;
      state.user = action.payload.user;
      state.patientProfile = action.payload.patientProfile;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.phoneNumber = action.payload.user?.phone_number || state.phoneNumber;
      state.error = null;
    },
    updateProfile: (state, action) => {
      state.patientProfile = {
        ...state.patientProfile,
        ...action.payload,
      };
    },
    logout: (state) => {
      return {
        ...initialState,
        authLevel: AUTH_LEVELS.GUEST,
      };
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setAuthLevel,
  setPhoneNumber,
  otpVerified,
  loginSuccess,
  updateProfile,
  logout,
  setLoading,
  setError,
  clearError,
} = authSlice.actions;

export { AUTH_LEVELS };
export default authSlice.reducer;
