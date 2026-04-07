export {
  __testables,
  clearOtpTestState,
  requestOtp,
  resendOtp,
  resetOtpStateForIdentifier,
  sendEmailOTP,
  sendPhoneOTP,
  verifyOtp,
  verifyOTP
} from './otp/index.js';

export { OtpServiceError, OTP_ERRORS, createOtpError } from './otp/errors.js';
