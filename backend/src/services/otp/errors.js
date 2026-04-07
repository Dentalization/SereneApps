export class OtpServiceError extends Error {
  constructor({ code, message, status = 400, retryable = false, details = {} }) {
    super(message);
    this.name = 'OtpServiceError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.details = details;
  }
}

export const OTP_ERRORS = Object.freeze({
  CHANNEL_DEPRECATED: {
    code: 'OTP_CHANNEL_DEPRECATED',
    message: 'Email OTP is deprecated. Use SMS OTP.',
    status: 410,
    retryable: false
  },
  CHANNEL_UNSUPPORTED: {
    code: 'OTP_CHANNEL_UNSUPPORTED',
    message: 'Unsupported OTP channel.',
    status: 400,
    retryable: false
  },
  IDENTIFIER_REQUIRED: {
    code: 'OTP_IDENTIFIER_REQUIRED',
    message: 'Phone number is required for SMS OTP.',
    status: 400,
    retryable: false
  },
  CHALLENGE_NOT_FOUND: {
    code: 'OTP_CHALLENGE_NOT_FOUND',
    message: 'OTP challenge not found.',
    status: 404,
    retryable: false
  },
  INVALID_CODE: {
    code: 'OTP_INVALID',
    message: 'Invalid OTP. Please try again.',
    status: 400,
    retryable: true
  },
  EXPIRED: {
    code: 'OTP_EXPIRED',
    message: 'OTP has expired. Please request a new one.',
    status: 410,
    retryable: true
  },
  LOCKED: {
    code: 'OTP_LOCKED',
    message: 'Too many failed attempts. Please try again later.',
    status: 423,
    retryable: false
  },
  COOLDOWN_ACTIVE: {
    code: 'OTP_COOLDOWN_ACTIVE',
    message: 'OTP cooldown active. Please wait before requesting another code.',
    status: 429,
    retryable: true
  },
  RATE_LIMITED: {
    code: 'OTP_RATE_LIMITED',
    message: 'OTP request limit reached. Please try again later.',
    status: 429,
    retryable: true
  },
  PROVIDER_MISCONFIGURED: {
    code: 'OTP_PROVIDER_MISCONFIGURED',
    message: 'OTP provider configuration is missing.',
    status: 500,
    retryable: false
  }
});

export function createOtpError(key, details = {}) {
  const base = OTP_ERRORS[key];
  if (!base) {
    return new OtpServiceError({
      code: 'OTP_UNKNOWN_ERROR',
      message: 'Unknown OTP error.',
      status: 500,
      retryable: false,
      details
    });
  }

  return new OtpServiceError({
    ...base,
    details
  });
}
