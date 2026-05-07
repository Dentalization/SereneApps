import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDeepDentalProxyHeaders,
  getDeepDentalProxyAuthError,
  isDeepDentalApiPath,
} from '../src/utils/deepDentalProxy.js';

test('DeepDental proxy recognizes only versioned DeepDental API paths', () => {
  assert.equal(isDeepDentalApiPath('/api/v1/chat/upload'), true);
  assert.equal(isDeepDentalApiPath('/api/v1/images/detect'), true);
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
