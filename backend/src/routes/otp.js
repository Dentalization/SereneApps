import express from 'express';
import { randomUUID } from 'crypto';
import { otpLimiter } from '../middleware/rate-limiter.js';
import { validate } from '../middleware/validate.js';
import {
  otpRequestSchema,
  otpVerifyRequestSchema
} from '../schemas/auth.schema.js';
import {
  OtpServiceError,
  requestOtp,
  resendOtp,
  verifyOtp
} from '../services/otp.service.js';

const router = express.Router();

function ensureCorrelationId(req, res) {
  const correlationId = req.get('X-Correlation-Id') || req.get('X-Request-Id') || randomUUID();
  res.setHeader('X-Correlation-Id', correlationId);
  return correlationId;
}

function otpErrorResponse(error, correlationId) {
  if (error instanceof OtpServiceError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          correlationId,
          details: error.details || {}
        }
      }
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: 'OTP_INTERNAL_ERROR',
        message: 'Failed to process OTP request.',
        retryable: false,
        correlationId,
        details: {}
      }
    }
  };
}

router.post('/requests', otpLimiter, validate(otpRequestSchema), async (req, res) => {
  const correlationId = ensureCorrelationId(req, res);

  try {
    const result = await requestOtp({
      identifier: req.body.channel === 'email' ? req.body.email : req.body.phone_number,
      channel: req.body.channel || 'sms',
      purpose: req.body.purpose || 'login',
      requestIp: req.ip,
      correlationId,
      userId: req.user?.id || null,
      idempotencyKey: req.get('Idempotency-Key') || null
    });

    return res.status(201).json(result);
  } catch (error) {
    if (!(error instanceof OtpServiceError)) {
      console.error('OTP request route error:', error);
    }
    const response = otpErrorResponse(error, correlationId);
    return res.status(response.status).json(response.body);
  }
});

router.post('/requests/:challengeId/resend', otpLimiter, async (req, res) => {
  const correlationId = ensureCorrelationId(req, res);

  try {
    const result = await resendOtp({
      challengeId: req.params.challengeId,
      requestIp: req.ip,
      correlationId,
      userId: req.user?.id || null,
      idempotencyKey: req.get('Idempotency-Key') || null
    });

    return res.status(200).json(result);
  } catch (error) {
    if (!(error instanceof OtpServiceError)) {
      console.error('OTP resend route error:', error);
    }
    const response = otpErrorResponse(error, correlationId);
    return res.status(response.status).json(response.body);
  }
});

router.post('/verifications', otpLimiter, validate(otpVerifyRequestSchema), async (req, res) => {
  const correlationId = ensureCorrelationId(req, res);

  try {
    const result = await verifyOtp({
      identifier: req.body.channel === 'email' ? req.body.email : req.body.phone_number,
      channel: req.body.channel || 'sms',
      otp: req.body.otp,
      requestIp: req.ip,
      correlationId,
      userId: req.user?.id || null
    });

    return res.status(200).json(result);
  } catch (error) {
    if (!(error instanceof OtpServiceError)) {
      console.error('OTP verify route error:', error);
    }
    const response = otpErrorResponse(error, correlationId);
    return res.status(response.status).json(response.body);
  }
});

export default router;
