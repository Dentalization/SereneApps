import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { twilioSmsOtpAdapter } from './twilio-sms-adapter.js';
import { createOtpError, OtpServiceError } from './errors.js';
import { logOtpEvent } from './logging.js';

const prisma = new PrismaClient();

const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return String(value).toLowerCase() === 'true';
}

export function getOtpPolicy(env = process.env) {
  return {
    length: parseInt(env.OTP_LENGTH || '6', 10),
    expiryMinutes: parseInt(env.OTP_EXPIRY_MINUTES || '5', 10),
    requestCooldownSeconds: parseInt(env.OTP_REQUEST_COOLDOWN_SECONDS || '60', 10),
    maxSendPerHour: parseInt(env.OTP_MAX_SEND_PER_HOUR || '5', 10),
    maxVerifyAttempts: parseInt(env.OTP_MAX_VERIFY_ATTEMPTS || '5', 10),
    lockoutMinutes: parseInt(env.OTP_LOCKOUT_MINUTES || '30', 10),
    ipWindowSeconds: parseInt(env.OTP_IP_WINDOW_SECONDS || '3600', 10),
    ipMaxRequests: parseInt(env.OTP_IP_MAX_REQUESTS || '20', 10),
    identifierWindowSeconds: parseInt(env.OTP_IDENTIFIER_WINDOW_SECONDS || '3600', 10),
    identifierMaxRequests: parseInt(env.OTP_IDENTIFIER_MAX_REQUESTS || '5', 10),
    emailDeprecated: parseBoolean(env.OTP_EMAIL_DEPRECATED, true),
    devReturnCode: parseBoolean(env.OTP_DEV_RETURN_CODE, false)
  };
}

function getOtpHashSecret(env = process.env) {
  if (env.OTP_HASH_SECRET) return env.OTP_HASH_SECRET;
  if (env.JWT_SECRET) return env.JWT_SECRET;
  if (env.NODE_ENV !== 'production') return 'sereneapps-dev-otp-secret';
  throw createOtpError('PROVIDER_MISCONFIGURED', { missing: 'OTP_HASH_SECRET' });
}

export function hashOtpValue(otp, env = process.env) {
  return crypto.createHmac('sha256', getOtpHashSecret(env)).update(String(otp)).digest('hex');
}

export function hashIdentityValue(value, env = process.env) {
  return crypto.createHmac('sha256', getOtpHashSecret(env)).update(String(value || '')).digest('hex');
}

export function isLegacyPlaintextOtp(storedValue = '') {
  return !/^[a-f0-9]{64}$/i.test(storedValue);
}

export function generateOtp(length = getOtpPolicy().length) {
  const max = 10 ** length;
  const min = 10 ** (length - 1);
  return Math.floor(min + Math.random() * (max - min)).toString();
}

function detectIdentifierChannel(identifier) {
  if (!identifier) return null;
  if (PHONE_REGEX.test(identifier)) return 'sms';
  if (EMAIL_REGEX.test(identifier)) return 'email';
  return null;
}

function normalizeChannel(channel) {
  if (!channel) return 'sms';
  if (channel === 'phone') return 'sms';
  return channel.toLowerCase();
}

function assertChannelAllowed(channel, env = process.env) {
  const normalized = normalizeChannel(channel);
  const policy = getOtpPolicy(env);
  if (normalized === 'email') {
    if (policy.emailDeprecated || env.NODE_ENV === 'production') {
      throw createOtpError('CHANNEL_DEPRECATED');
    }
    return normalized;
  }
  if (normalized !== 'sms') {
    throw createOtpError('CHANNEL_UNSUPPORTED', { channel: normalized });
  }
  return normalized;
}

function assertIdentifierMatchesChannel(identifier, channel) {
  if (channel === 'sms' && !PHONE_REGEX.test(identifier || '')) {
    throw createOtpError('IDENTIFIER_REQUIRED');
  }
  if (channel === 'email' && !EMAIL_REGEX.test(identifier || '')) {
    throw createOtpError('IDENTIFIER_REQUIRED');
  }
}

async function recordOtpAttempt({
  otpVerificationId = null,
  action,
  identifier,
  ipAddress,
  channel,
  outcome,
  reason = null,
  correlationId = null,
  userId = null,
  idempotencyKey = null,
  metadata = {}
}) {
  return prisma.otpRequestAttempt.create({
    data: {
      otpVerificationId,
      action,
      identifierHash: identifier ? hashIdentityValue(identifier) : null,
      ipHash: ipAddress ? hashIdentityValue(ipAddress) : null,
      channel,
      outcome,
      reason,
      correlationId,
      userId: userId ? BigInt(userId) : null,
      idempotencyKey,
      metadata
    }
  });
}

async function enforceRequestThrottle({ identifier, ipAddress, action, correlationId, channel, userId }) {
  const policy = getOtpPolicy();
  const now = new Date();
  const ipHash = ipAddress ? hashIdentityValue(ipAddress) : null;
  const identifierHash = identifier ? hashIdentityValue(identifier) : null;

  const [ipCount, identifierCount] = await Promise.all([
    ipHash
      ? prisma.otpRequestAttempt.count({
          where: {
            ipHash,
            action: { in: ['request', 'resend'] },
            createdAt: { gte: new Date(now.getTime() - policy.ipWindowSeconds * 1000) }
          }
        })
      : 0,
    identifierHash
      ? prisma.otpRequestAttempt.count({
          where: {
            identifierHash,
            action: { in: ['request', 'resend'] },
            createdAt: { gte: new Date(now.getTime() - policy.identifierWindowSeconds * 1000) }
          }
        })
      : 0
  ]);

  if (ipHash && ipCount >= policy.ipMaxRequests) {
    await recordOtpAttempt({
      action,
      identifier,
      ipAddress,
      channel,
      outcome: 'blocked',
      reason: 'ip_rate_limited',
      correlationId,
      userId
    });
    throw createOtpError('RATE_LIMITED', { scope: 'ip' });
  }

  if (identifierHash && identifierCount >= policy.identifierMaxRequests) {
    await recordOtpAttempt({
      action,
      identifier,
      ipAddress,
      channel,
      outcome: 'blocked',
      reason: 'identifier_rate_limited',
      correlationId,
      userId
    });
    throw createOtpError('RATE_LIMITED', { scope: 'identifier' });
  }
}

async function findIdempotentChallenge({ identifier, channel, idempotencyKey }) {
  if (!idempotencyKey) return null;

  const attempt = await prisma.otpRequestAttempt.findFirst({
    where: {
      identifierHash: hashIdentityValue(identifier),
      channel,
      idempotencyKey,
      action: { in: ['request', 'resend'] },
      outcome: 'accepted'
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!attempt?.otpVerificationId) {
    return null;
  }

  const challenge = await prisma.oTPVerification.findUnique({
    where: { id: attempt.otpVerificationId }
  });

  if (!challenge || new Date() > new Date(challenge.expiresAt)) {
    return null;
  }

  return challenge;
}

function buildOtpMessage(otp, env = process.env) {
  const expiryMinutes = env.OTP_EXPIRY_MINUTES || '5';
  return `Kode OTP SereneApps Anda: ${otp}. Berlaku selama ${expiryMinutes} menit.`;
}

function buildOtpResponse(challenge, { otp, provider, idempotent = false }) {
  const remainingAttempts = Math.max(0, (challenge.maxAttempts || 0) - (challenge.attempts || 0));
  return {
    challengeId: challenge.id,
    identifier: challenge.identifier,
    channel: challenge.type === 'email' ? 'email' : 'sms',
    expiresAt: challenge.expiresAt,
    cooldownUntil: challenge.cooldownUntil,
    remainingAttempts,
    idempotent,
    provider,
    ...(getOtpPolicy().devReturnCode && otp ? { otp } : {})
  };
}

async function persistChallenge({ identifier, channel, otp, purpose, requestIp }) {
  const policy = getOtpPolicy();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + policy.expiryMinutes * 60 * 1000);
  const cooldownUntil = new Date(now.getTime() + policy.requestCooldownSeconds * 1000);
  const otpHash = hashOtpValue(otp);
  const ipHash = requestIp ? hashIdentityValue(requestIp) : null;
  const existing = await prisma.oTPVerification.findUnique({
    where: { identifier }
  });

  if (existing?.lockedUntil && now < new Date(existing.lockedUntil)) {
    throw createOtpError('LOCKED', { lockedUntil: existing.lockedUntil });
  }
  if (existing?.cooldownUntil && now < new Date(existing.cooldownUntil)) {
    throw createOtpError('COOLDOWN_ACTIVE', { cooldownUntil: existing.cooldownUntil });
  }

  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const nextSendCount =
    existing?.lastSentAt && new Date(existing.lastSentAt) >= oneHourAgo
      ? (existing.resendCount || 0) + 1
      : 1;

  if (nextSendCount > policy.maxSendPerHour) {
    throw createOtpError('RATE_LIMITED', { scope: 'identifier_window' });
  }

  return prisma.oTPVerification.upsert({
    where: { identifier },
    update: {
      otp: otpHash,
      type: channel === 'email' ? 'email' : 'phone',
      purpose,
      expiresAt,
      attempts: 0,
      resendCount: nextSendCount,
      maxAttempts: policy.maxVerifyAttempts,
      cooldownUntil,
      lockedUntil: null,
      lastSentAt: now,
      lastRequestIpHash: ipHash,
      verified: false,
      verifiedAt: null
    },
    create: {
      identifier,
      otp: otpHash,
      type: channel === 'email' ? 'email' : 'phone',
      purpose,
      expiresAt,
      resendCount: 1,
      maxAttempts: policy.maxVerifyAttempts,
      cooldownUntil,
      lastSentAt: now,
      lastRequestIpHash: ipHash
    }
  });
}

export async function requestOtp({
  identifier,
  channel = 'sms',
  purpose = 'login',
  requestIp = null,
  correlationId = null,
  userId = null,
  idempotencyKey = null
}) {
  try {
    const normalizedChannel = assertChannelAllowed(channel);
    assertIdentifierMatchesChannel(identifier, normalizedChannel);
    const existingChallenge = await findIdempotentChallenge({
      identifier,
      channel: normalizedChannel,
      idempotencyKey
    });

    if (existingChallenge) {
      logOtpEvent({
        event: 'otp.request',
        correlationId,
        userId,
        identifier,
        channel: normalizedChannel,
        outcome: 'idempotent_hit'
      });
      return buildOtpResponse(existingChallenge, {
        provider: { name: normalizedChannel === 'sms' ? 'twilio' : 'internal-email-fallback' },
        idempotent: true
      });
    }

    await enforceRequestThrottle({
      identifier,
      ipAddress: requestIp,
      action: 'request',
      correlationId,
      channel: normalizedChannel,
      userId
    });

    const otp = generateOtp();
    let providerResult = {
      name: normalizedChannel === 'sms' ? 'twilio' : 'internal-email-fallback',
      delivered: false
    };

    if (normalizedChannel === 'sms') {
      providerResult = await twilioSmsOtpAdapter.sendOtpSms({
        to: identifier,
        body: buildOtpMessage(otp)
      });
    }

    const challenge = await persistChallenge({
      identifier,
      channel: normalizedChannel,
      otp,
      purpose,
      requestIp
    });

    await recordOtpAttempt({
      otpVerificationId: challenge.id,
      action: 'request',
      identifier,
      ipAddress: requestIp,
      channel: normalizedChannel,
      outcome: 'accepted',
      correlationId,
      userId,
      idempotencyKey,
      metadata: {
        provider: providerResult.provider || providerResult.name || 'internal',
        providerSid: providerResult.sid || null
      }
    });

    logOtpEvent({
      event: 'otp.request',
      correlationId,
      userId,
      identifier,
      channel: normalizedChannel,
      outcome: 'accepted',
      metadata: {
        provider: providerResult.provider || providerResult.name || 'internal'
      }
    });

    return buildOtpResponse(challenge, {
      otp,
      provider: {
        name: providerResult.provider || providerResult.name || 'internal',
        delivered: providerResult.delivered
      }
    });
  } catch (error) {
    const otpError = error instanceof OtpServiceError
      ? error
      : error?.code === 'OTP_PROVIDER_MISCONFIGURED'
        ? createOtpError('PROVIDER_MISCONFIGURED')
        : error;

    if (otpError instanceof OtpServiceError) {
      logOtpEvent({
        level: otpError.status >= 500 ? 'error' : 'warn',
        event: 'otp.request',
        correlationId,
        userId,
        identifier,
        channel: normalizeChannel(channel),
        outcome: 'rejected',
        reason: otpError.code
      });
    }

    throw otpError;
  }
}

export async function resendOtp({
  challengeId,
  requestIp = null,
  correlationId = null,
  userId = null,
  idempotencyKey = null
}) {
  const challenge = await prisma.oTPVerification.findUnique({
    where: { id: challengeId }
  });

  if (!challenge) {
    throw createOtpError('CHALLENGE_NOT_FOUND', { challengeId });
  }

  const channel = challenge.type === 'email' ? 'email' : 'sms';
  return requestOtp({
    identifier: challenge.identifier,
    channel,
    purpose: challenge.purpose || 'login',
    requestIp,
    correlationId,
    userId,
    idempotencyKey
  });
}

function compareStoredOtp(storedValue, inputOtp) {
  if (isLegacyPlaintextOtp(storedValue)) {
    return storedValue === inputOtp;
  }

  const candidate = hashOtpValue(inputOtp);
  return crypto.timingSafeEqual(Buffer.from(storedValue, 'hex'), Buffer.from(candidate, 'hex'));
}

export async function verifyOtp({
  identifier,
  otp,
  channel = null,
  requestIp = null,
  correlationId = null,
  userId = null
}) {
  const detectedChannel = normalizeChannel(channel || detectIdentifierChannel(identifier) || 'sms');

  try {
    const normalizedChannel = assertChannelAllowed(detectedChannel);
    assertIdentifierMatchesChannel(identifier, normalizedChannel);

    const challenge = await prisma.oTPVerification.findUnique({
      where: { identifier }
    });

    if (!challenge) {
      await recordOtpAttempt({
        action: 'verify',
        identifier,
        ipAddress: requestIp,
        channel: normalizedChannel,
        outcome: 'rejected',
        reason: 'challenge_not_found',
        correlationId,
        userId
      });
      throw createOtpError('CHALLENGE_NOT_FOUND', { identifier });
    }

    const now = new Date();
    if (challenge.lockedUntil && now < new Date(challenge.lockedUntil)) {
      await recordOtpAttempt({
        otpVerificationId: challenge.id,
        action: 'verify',
        identifier,
        ipAddress: requestIp,
        channel: normalizedChannel,
        outcome: 'blocked',
        reason: 'locked',
        correlationId,
        userId
      });
      throw createOtpError('LOCKED', { lockedUntil: challenge.lockedUntil });
    }

    if (now > new Date(challenge.expiresAt)) {
      await recordOtpAttempt({
        otpVerificationId: challenge.id,
        action: 'verify',
        identifier,
        ipAddress: requestIp,
        channel: normalizedChannel,
        outcome: 'rejected',
        reason: 'expired',
        correlationId,
        userId
      });
      throw createOtpError('EXPIRED');
    }

    const matches = compareStoredOtp(challenge.otp, otp);
    if (!matches) {
      const policy = getOtpPolicy();
      const nextAttempts = (challenge.attempts || 0) + 1;
      const shouldLock = nextAttempts >= (challenge.maxAttempts || policy.maxVerifyAttempts);
      await prisma.oTPVerification.update({
        where: { identifier },
        data: {
          attempts: { increment: 1 },
          lockedUntil: shouldLock
            ? new Date(Date.now() + policy.lockoutMinutes * 60 * 1000)
            : challenge.lockedUntil
        }
      });
      await recordOtpAttempt({
        otpVerificationId: challenge.id,
        action: 'verify',
        identifier,
        ipAddress: requestIp,
        channel: normalizedChannel,
        outcome: 'rejected',
        reason: shouldLock ? 'locked' : 'invalid',
        correlationId,
        userId
      });

      throw shouldLock ? createOtpError('LOCKED') : createOtpError('INVALID_CODE');
    }

    await prisma.oTPVerification.update({
      where: { identifier },
      data: {
        verified: true,
        verifiedAt: new Date(),
        lockedUntil: null,
        cooldownUntil: null,
        otp: hashOtpValue(otp)
      }
    });

    await recordOtpAttempt({
      otpVerificationId: challenge.id,
      action: 'verify',
      identifier,
      ipAddress: requestIp,
      channel: normalizedChannel,
      outcome: 'accepted',
      reason: 'verified',
      correlationId,
      userId
    });

    logOtpEvent({
      event: 'otp.verify',
      correlationId,
      userId,
      identifier,
      channel: normalizedChannel,
      outcome: 'accepted'
    });

    return {
      verified: true,
      verifiedAt: new Date().toISOString(),
      challengeId: challenge.id
    };
  } catch (error) {
    if (error instanceof OtpServiceError) {
      logOtpEvent({
        level: error.status >= 500 ? 'error' : 'warn',
        event: 'otp.verify',
        correlationId,
        userId,
        identifier,
        channel: detectedChannel,
        outcome: 'rejected',
        reason: error.code
      });
    }
    throw error;
  }
}

export async function sendPhoneOTP(phoneNumber, context = {}) {
  const result = await requestOtp({
    identifier: phoneNumber,
    channel: 'sms',
    purpose: context.purpose || 'login',
    requestIp: context.requestIp || null,
    correlationId: context.correlationId || null,
    userId: context.userId || null,
    idempotencyKey: context.idempotencyKey || null
  });

  return {
    success: true,
    message: 'OTP sent to phone',
    challengeId: result.challengeId,
    expiresAt: result.expiresAt,
    cooldownUntil: result.cooldownUntil,
    remainingAttempts: result.remainingAttempts,
    otp: result.otp
  };
}

export async function sendEmailOTP(email, context = {}) {
  const result = await requestOtp({
    identifier: email,
    channel: 'email',
    purpose: context.purpose || 'login',
    requestIp: context.requestIp || null,
    correlationId: context.correlationId || null,
    userId: context.userId || null,
    idempotencyKey: context.idempotencyKey || null
  });

  return {
    success: true,
    message: 'OTP accepted for legacy email fallback',
    challengeId: result.challengeId,
    expiresAt: result.expiresAt,
    cooldownUntil: result.cooldownUntil,
    remainingAttempts: result.remainingAttempts,
    otp: result.otp
  };
}

export async function verifyOTP(identifier, otp, context = {}) {
  return verifyOtp({
    identifier,
    otp,
    channel: context.channel || null,
    requestIp: context.requestIp || null,
    correlationId: context.correlationId || null,
    userId: context.userId || null
  });
}

export async function resetOtpStateForIdentifier(identifier) {
  await prisma.oTPVerification.deleteMany({ where: { identifier } });
  await prisma.otpRequestAttempt.deleteMany({
    where: { identifierHash: hashIdentityValue(identifier) }
  });
}

export async function clearOtpTestState() {
  await prisma.otpRequestAttempt.deleteMany();
  await prisma.oTPVerification.deleteMany();
}

export const __testables = {
  PHONE_REGEX,
  EMAIL_REGEX,
  detectIdentifierChannel,
  normalizeChannel,
  getOtpPolicy,
  generateOtp,
  hashOtpValue,
  hashIdentityValue,
  isLegacyPlaintextOtp
};
