import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateAttachmentStorageConfiguration,
} from '../src/services/communications/attachmentStorageService.js';

const ORIGINAL_ENV = { ...process.env };

function resetEnv(overrides = {}) {
  process.env = { ...ORIGINAL_ENV, ...overrides };
  for (const key of [
    'APP_ENV',
    'COMM_ATTACHMENT_SIGNING_SECRET',
    'JWT_SECRET',
    'NODE_ENV',
    'COMM_ATTACHMENT_STORAGE_DRIVER',
  ]) {
    if (overrides[key] === undefined && !(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
}

test.afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test('attachment signing secret is mandatory outside local development', () => {
  resetEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    COMM_ATTACHMENT_SIGNING_SECRET: '',
    JWT_SECRET: '',
    COMM_ATTACHMENT_STORAGE_DRIVER: 'local-private',
  });

  assert.throws(
    () => validateAttachmentStorageConfiguration(),
    /COMM_ATTACHMENT_SIGNING_SECRET_REQUIRED/
  );
});

test('attachment signing secret validation accepts a dedicated production secret', () => {
  resetEnv({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    COMM_ATTACHMENT_SIGNING_SECRET: 'attachment-signing-secret-for-tests-32-bytes',
    JWT_SECRET: '',
    COMM_ATTACHMENT_STORAGE_DRIVER: 'local-private',
  });

  assert.equal(validateAttachmentStorageConfiguration().ok, true);
});
