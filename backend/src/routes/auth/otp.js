import express from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import otpService from '../../services/auth/otpService.js';
import { generateTokens } from '../../utils/tokens.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 absolute requests limit per hour natively mapped per IP structure
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Terlalu banyak permintaan OTP, silakan coba lagi nanti.' } }
});

router.use(otpRateLimiter);

router.post('/requests', async (req, res) => {
  try {
    const { phone, purpose } = req.body;
    if (!phone) {
      return res.status(400).json({ error: { code: 'MISSING_PHONE' } });
    }

    const rawIp = req.ip || req.connection.remoteAddress || 'unknown';
    const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex');

    const result = await otpService.requestOtp({ phone, purpose, ipHash });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[OTP Request Error]', error.message);
    if (error.code === 'OTP_COOLDOWN' || error.code === 'OTP_LOCKED') {
      return res.status(429).json({ error });
    }
    return res.status(error.code ? 400 : 500).json({ error });
  }
});

router.post('/verifications', async (req, res) => {
  try {
    const { challengeId, code } = req.body;
    if (!challengeId || !code) {
      return res.status(400).json({ error: { code: 'MISSING_PARAMETERS' } });
    }

    const { verified, phone } = await otpService.verifyOtp({ challengeId, code });

    // Look up parent mapping natively assuming unified phone footprints matching patients universally
    const user = await prisma.user.findFirst({
       where: { phone }
    });

    let accessToken = null;
    let refreshToken = null;

    if (user) {
       const tokens = generateTokens(user);
       accessToken = tokens.accessToken;
       refreshToken = tokens.refreshToken;
    }

    return res.status(200).json({ verified, accessToken, refreshToken, isNewUser: !user });
  } catch (error) {
    console.error('[OTP Verification Error]', error.message);
    const code = error.code;
    if (['OTP_INVALID', 'OTP_EXPIRED', 'OTP_NOT_FOUND', 'OTP_LOCKED', 'OTP_ALREADY_USED'].includes(code)) {
      return res.status(400).json({ error });
    }
    return res.status(500).json({ error });
  }
});

router.post('/requests/:challengeId/resend', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const rawIp = req.ip || req.connection.remoteAddress || 'unknown';
    const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex');

    const result = await otpService.resendOtp({ challengeId, ipHash });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[OTP Resend Error]', error.message);
    if (error.code === 'OTP_COOLDOWN' || error.code === 'OTP_LOCKED') {
      return res.status(429).json({ error });
    }
    return res.status(error.code ? 400 : 500).json({ error });
  }
});

export default router;
