import rateLimit from 'express-rate-limit';

// Auth endpoints: 5 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Terlalu banyak percobaan. Silakan coba lagi dalam 15 menit.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// OTP endpoints: 3 requests per 5 minutes (more strict)
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 requests per window
  message: {
    code: 'TOO_MANY_OTP_REQUESTS',
    message: 'Terlalu banyak permintaan OTP. Silakan coba lagi dalam 5 menit.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// General API: 100 requests per minute
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  message: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false,
});

export {
  authLimiter,
  otpLimiter,
  generalLimiter,
};
