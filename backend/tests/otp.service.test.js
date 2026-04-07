import 'dotenv/config';
import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

process.env.OTP_HASH_SECRET = process.env.OTP_HASH_SECRET || 'otp-test-secret';
process.env.OTP_DEV_RETURN_CODE = 'true';
process.env.OTP_EMAIL_DEPRECATED = 'true';
process.env.OTP_REQUEST_COOLDOWN_SECONDS = '60';
process.env.OTP_MAX_SEND_PER_HOUR = '5';
process.env.OTP_MAX_VERIFY_ATTEMPTS = '2';
process.env.OTP_LOCKOUT_MINUTES = '30';
process.env.OTP_IP_WINDOW_SECONDS = '3600';
process.env.OTP_IP_MAX_REQUESTS = '20';
process.env.OTP_IDENTIFIER_WINDOW_SECONDS = '3600';
process.env.OTP_IDENTIFIER_MAX_REQUESTS = '5';

const prisma = new PrismaClient();
const otpModule = await import('../src/services/otp.service.js');
const {
  __testables,
  clearOtpTestState,
  requestOtp,
  verifyOtp
} = otpModule;

beforeEach(async () => {
  await clearOtpTestState();
});

after(async () => {
  await clearOtpTestState();
  await prisma.$disconnect();
});

test('hashes OTP values and detects legacy plaintext payloads', () => {
  const hashed = __testables.hashOtpValue('123456');

  assert.notEqual(hashed, '123456');
  assert.equal(hashed.length, 64);
  assert.equal(__testables.isLegacyPlaintextOtp('123456'), true);
  assert.equal(__testables.isLegacyPlaintextOtp(hashed), false);
});

test('stores SMS OTP hashed and verifies successfully', async () => {
  const identifier = '+628111000001';

  const request = await requestOtp({
    identifier,
    channel: 'sms',
    purpose: 'login',
    requestIp: '10.10.10.1',
    correlationId: 'cor-test-1'
  });

  assert.ok(request.challengeId);
  assert.ok(request.otp);

  const stored = await prisma.oTPVerification.findUnique({
    where: { identifier }
  });

  assert.ok(stored);
  assert.notEqual(stored.otp, request.otp);
  assert.equal(stored.otp.length, 64);

  const verified = await verifyOtp({
    identifier,
    channel: 'sms',
    otp: request.otp,
    requestIp: '10.10.10.1',
    correlationId: 'cor-test-1'
  });

  assert.equal(verified.verified, true);
});

test('enforces cooldown between SMS OTP requests', async () => {
  const identifier = '+628111000002';

  await requestOtp({
    identifier,
    channel: 'sms',
    purpose: 'login',
    requestIp: '10.10.10.2',
    correlationId: 'cor-test-2'
  });

  await assert.rejects(
    requestOtp({
      identifier,
      channel: 'sms',
      purpose: 'login',
      requestIp: '10.10.10.2',
      correlationId: 'cor-test-2b'
    }),
    (error) => error.code === 'OTP_COOLDOWN_ACTIVE'
  );
});

test('locks OTP challenge after repeated invalid verification attempts', async () => {
  const identifier = '+628111000003';

  await requestOtp({
    identifier,
    channel: 'sms',
    purpose: 'login',
    requestIp: '10.10.10.3',
    correlationId: 'cor-test-3'
  });

  await assert.rejects(
    verifyOtp({
      identifier,
      channel: 'sms',
      otp: '000000',
      requestIp: '10.10.10.3',
      correlationId: 'cor-test-3a'
    }),
    (error) => error.code === 'OTP_INVALID'
  );

  await assert.rejects(
    verifyOtp({
      identifier,
      channel: 'sms',
      otp: '000000',
      requestIp: '10.10.10.3',
      correlationId: 'cor-test-3b'
    }),
    (error) => error.code === 'OTP_LOCKED'
  );
});
