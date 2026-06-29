import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildDeepDentalProxyHeaders,
  getDeepDentalProxyAuthError,
  isDeepDentalApiPath,
  resolveDeepDentalTlsPolicy,
  resolveProxyTimeoutMs,
} from '../src/utils/deepDentalProxy.js';

test('DeepDental proxy recognizes only versioned DeepDental API paths', () => {
  assert.equal(isDeepDentalApiPath('/api/v1/chat/upload'), true);
  assert.equal(isDeepDentalApiPath('/api/v1/images/detect'), true);
  assert.equal(isDeepDentalApiPath('/api/v1/health'), true);
  assert.equal(isDeepDentalApiPath('/api/v1/health/'), true);
  assert.equal(isDeepDentalApiPath('/health'), false);
  assert.equal(isDeepDentalApiPath('/stream-slice/1/axial/1'), false);
});

test('DeepDental proxy strips client API keys and injects backend secret', () => {
  const headers = buildDeepDentalProxyHeaders({
    incomingHeaders: {
      authorization: 'Bearer token',
      'x-api-key': 'client-leak',
      'content-type': 'application/json',
      host: 'localhost:4000',
    },
    backendApiKey: 'server-secret',
  });

  assert.equal(headers.get('authorization'), 'Bearer token');
  assert.equal(headers.get('x-api-key'), 'server-secret');
  assert.equal(headers.get('content-type'), 'application/json');
  assert.equal(headers.has('host'), false);
});

test('DeepDental proxy requires bearer auth and backend API key', () => {
  assert.deepEqual(
    getDeepDentalProxyAuthError({
      path: '/api/v1/chat/upload',
      authorization: '',
      backendApiKey: 'server-secret',
      verifyToken: () => ({ roles: ['dentist'] }),
    }),
    { status: 401, code: 'deepdental_proxy_auth_required' }
  );

  assert.deepEqual(
    getDeepDentalProxyAuthError({
      path: '/api/v1/chat/upload',
      authorization: 'Bearer token',
      backendApiKey: '',
      verifyToken: () => ({ roles: ['dentist'] }),
    }),
    { status: 503, code: 'deepdental_proxy_not_configured' }
  );

  assert.equal(
    getDeepDentalProxyAuthError({
      path: '/api/v1/chat/upload',
      authorization: 'Bearer token',
      backendApiKey: 'server-secret',
      verifyToken: () => ({ roles: ['dentist'] }),
    }),
    null
  );
});

test('DeepDental TLS policy is secure by default and forbids insecure production mode', () => {
  assert.deepEqual(resolveDeepDentalTlsPolicy({}), {
    rejectUnauthorized: true,
    ca: null,
    insecureDevelopmentMode: false,
  });
  assert.deepEqual(resolveDeepDentalTlsPolicy({
    NODE_ENV: 'development',
    DEEPDENTAL_ALLOW_INSECURE_TLS: 'true',
  }), {
    rejectUnauthorized: false,
    ca: null,
    insecureDevelopmentMode: true,
  });
  assert.throws(
    () => resolveDeepDentalTlsPolicy({
      NODE_ENV: 'production',
      DEEPDENTAL_ALLOW_INSECURE_TLS: 'true',
    }),
    /deepdental_insecure_tls_forbidden/
  );
  assert.throws(
    () => resolveDeepDentalTlsPolicy({
      NODE_ENV: 'production',
      NODE_TLS_REJECT_UNAUTHORIZED: '0',
    }),
    /deepdental_insecure_tls_forbidden/
  );
});

test('DeepDental proxy timeout configuration is bounded and rejects invalid values', () => {
  assert.equal(resolveProxyTimeoutMs(undefined), 75_000);
  assert.equal(resolveProxyTimeoutMs('invalid'), 75_000);
  assert.equal(resolveProxyTimeoutMs('1000'), 10_000);
  assert.equal(resolveProxyTimeoutMs('90000'), 90_000);
});

test('DeepDental image analysis proxy has a four minute default request window', () => {
  const serverSource = readFileSync(new URL('../src/server.js', import.meta.url), 'utf8');
  assert.match(serverSource, /DEEPDENTAL_PROXY_TIMEOUT_MS/);
  assert.match(serverSource, /240_000/);
});
