import 'dotenv/config';
import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../src/db.js';
import authRouter from '../src/routes/auth.js';
import {
  authenticateToken,
  requireRoles,
  verify,
} from '../src/utils/tokens.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'testability-jwt-secret';

const TEST_EMAIL = 'testability-auth-patient@sereneapps.local';
const TEST_PASSWORD = 'Password123!';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/v1/auth', authRouter);
  app.get('/v1/protected', authenticateToken, (req, res) => {
    res.json({ userId: req.user.id, roles: req.user.roles });
  });
  app.get('/v1/dentist-only', authenticateToken, requireRoles(['dentist']), (_req, res) => {
    res.json({ ok: true });
  });
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
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  return {
    status: response.status,
    json: text ? JSON.parse(text) : {},
  };
}

async function cleanupAuthUser() {
  await query(
    `DELETE FROM refresh_tokens
     WHERE user_id IN (SELECT id FROM users WHERE email = $1)`,
    [TEST_EMAIL]
  );
  await query('DELETE FROM users WHERE email = $1', [TEST_EMAIL]);
}

async function createAuthUser() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const { rows } = await query(
    `INSERT INTO users(name, email, password_hash, roles, phone_number)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, roles, name, phone_number, last_login_at`,
    ['Testability Patient', TEST_EMAIL, passwordHash, ['patient'], '+628123450001']
  );
  return rows[0];
}

beforeEach(async () => {
  await cleanupAuthUser();
  await createAuthUser();
});

after(async () => {
  await cleanupAuthUser();
});

test('login issues access and refresh tokens for a valid patient account', async () => {
  await withServer(async (baseUrl) => {
    const response = await httpJson(baseUrl, '/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    assert.equal(response.status, 200);
    assert.ok(response.json.accessToken);
    assert.ok(response.json.refreshToken);
    assert.equal(response.json.user.email, TEST_EMAIL);
    assert.equal(response.json.user.password_hash, undefined);

    const payload = verify(response.json.accessToken);
    assert.equal(payload.sub, response.json.user.id);
    assert.deepEqual(payload.roles, ['patient']);
  });
});

test('login rejects missing credentials and invalid passwords', async () => {
  await withServer(async (baseUrl) => {
    const missing = await httpJson(baseUrl, '/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL }),
    });
    const invalid = await httpJson(baseUrl, '/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: 'wrong-password',
      }),
    });

    assert.equal(missing.status, 400);
    assert.equal(invalid.status, 401);
  });
});

test('authenticated me endpoint returns the current user and effective roles', async () => {
  await withServer(async (baseUrl) => {
    const login = await httpJson(baseUrl, '/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    const me = await httpJson(baseUrl, '/v1/auth/me', {
      headers: {
        Authorization: `Bearer ${login.json.accessToken}`,
      },
    });

    assert.equal(me.status, 200);
    assert.equal(me.json.email, TEST_EMAIL);
    assert.deepEqual(me.json.effectiveRoles, ['patient']);
  });
});

test('refresh and logout enforce refresh-token session control', async () => {
  await withServer(async (baseUrl) => {
    const login = await httpJson(baseUrl, '/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    const refreshed = await httpJson(baseUrl, '/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: login.json.refreshToken }),
    });

    assert.equal(refreshed.status, 200);
    assert.ok(refreshed.json.accessToken);
    assert.deepEqual(verify(refreshed.json.accessToken).roles, ['patient']);

    const logout = await httpJson(baseUrl, '/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: login.json.refreshToken }),
    });
    assert.equal(logout.status, 200);

    const replay = await httpJson(baseUrl, '/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: login.json.refreshToken }),
    });
    assert.equal(replay.status, 401);
  });
});

test('access-control middleware accepts valid tokens and blocks missing or insufficient roles', async () => {
  await withServer(async (baseUrl) => {
    const login = await httpJson(baseUrl, '/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    const missing = await httpJson(baseUrl, '/v1/protected');
    const protectedRoute = await httpJson(baseUrl, '/v1/protected', {
      headers: {
        Authorization: `Bearer ${login.json.accessToken}`,
      },
    });
    const dentistOnly = await httpJson(baseUrl, '/v1/dentist-only', {
      headers: {
        Authorization: `Bearer ${login.json.accessToken}`,
      },
    });

    assert.equal(missing.status, 401);
    assert.equal(protectedRoute.status, 200);
    assert.equal(protectedRoute.json.userId, login.json.user.id);
    assert.deepEqual(protectedRoute.json.roles, ['patient']);
    assert.equal(dentistOnly.status, 403);
  });
});
