import 'dotenv/config';
import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { PrismaClient } from '@prisma/client';

process.env.OTP_HASH_SECRET = process.env.OTP_HASH_SECRET || 'otp-test-secret';
process.env.OTP_DEV_RETURN_CODE = 'true';
process.env.OTP_EMAIL_DEPRECATED = 'true';
process.env.OTP_REQUEST_COOLDOWN_SECONDS = '60';
process.env.OTP_MAX_SEND_PER_HOUR = '5';
process.env.OTP_MAX_VERIFY_ATTEMPTS = '5';
process.env.OTP_LOCKOUT_MINUTES = '30';
process.env.OTP_IP_WINDOW_SECONDS = '3600';
process.env.OTP_IP_MAX_REQUESTS = '20';
process.env.OTP_IDENTIFIER_WINDOW_SECONDS = '3600';
process.env.OTP_IDENTIFIER_MAX_REQUESTS = '5';

const prisma = new PrismaClient();
const otpRouter = (await import('../src/routes/otp.js')).default;
const authRouter = (await import('../src/routes/auth.js')).default;
const { clearOtpTestState } = await import('../src/services/otp.service.js');

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/v1/otp', otpRouter);
  app.use('/v1/auth', authRouter);
  return app;
}

async function withServer(run) {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function httpJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  return {
    status: response.status,
    json: text ? JSON.parse(text) : {}
  };
}

beforeEach(async () => {
  await clearOtpTestState();
});

after(async () => {
  await clearOtpTestState();
  await prisma.$disconnect();
});

test('POST /v1/otp/requests sends SMS OTP successfully', async () => {
  await withServer(async (baseUrl) => {
    const response = await httpJson(baseUrl, '/v1/otp/requests', {
      method: 'POST',
      headers: {
        'X-Forwarded-For': '10.20.0.1'
      },
      body: JSON.stringify({
        channel: 'sms',
        phone_number: '+628111100001'
      })
    });

    assert.equal(response.status, 201);
    assert.ok(response.json.challengeId);
    assert.equal(response.json.channel, 'sms');
    assert.ok(response.json.otp);
  });
});

test('POST /v1/otp/requests rejects email OTP with deprecation error', async () => {
  await withServer(async (baseUrl) => {
    const response = await httpJson(baseUrl, '/v1/otp/requests', {
      method: 'POST',
      headers: {
        'X-Forwarded-For': '10.20.0.2'
      },
      body: JSON.stringify({
        channel: 'email',
        email: 'legacy@serene.test'
      })
    });

    assert.equal(response.status, 410);
    assert.equal(response.json.error.code, 'OTP_CHANNEL_DEPRECATED');
    assert.equal(response.json.error.retryable, false);
  });
});

test('POST /v1/auth/send-email-otp rejects deprecated email OTP path', async () => {
  await withServer(async (baseUrl) => {
    const response = await httpJson(baseUrl, '/v1/auth/send-email-otp', {
      method: 'POST',
      headers: {
        'X-Forwarded-For': '10.20.0.3'
      },
      body: JSON.stringify({
        email: 'legacy-auth@serene.test'
      })
    });

    assert.equal(response.status, 410);
    assert.equal(response.json.error.code, 'OTP_CHANNEL_DEPRECATED');
  });
});

test('POST /v1/otp/requests is idempotent when Idempotency-Key is reused', async () => {
  await withServer(async (baseUrl) => {
    const requestBody = {
      channel: 'sms',
      phone_number: '+628111100004'
    };

    const first = await httpJson(baseUrl, '/v1/otp/requests', {
      method: 'POST',
      headers: {
        'Idempotency-Key': 'otp-req-001',
        'X-Forwarded-For': '10.20.0.4'
      },
      body: JSON.stringify(requestBody)
    });

    const replay = await httpJson(baseUrl, '/v1/otp/requests', {
      method: 'POST',
      headers: {
        'Idempotency-Key': 'otp-req-001',
        'X-Forwarded-For': '10.20.0.4'
      },
      body: JSON.stringify(requestBody)
    });

    assert.equal(first.status, 201);
    assert.equal(replay.status, 201);
    assert.equal(replay.json.idempotent, true);
    assert.equal(first.json.challengeId, replay.json.challengeId);
  });
});
