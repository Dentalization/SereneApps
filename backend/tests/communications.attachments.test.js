import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables } from '../src/services/communications/attachmentStorageService.js';

process.env.JWT_SECRET = 'attachment-test-secret';

test('attachment signed URLs validate without exposing storage object keys as authority', () => {
  const objectKey = 'appointments/123/chat/example.pdf';
  const url = __testables.buildSignedAttachmentUrl({
    messageId: '77',
    objectKey,
    expiresInSeconds: 300
  });
  const parsed = new URL(url, 'http://localhost');

  assert.equal(parsed.pathname, '/v1/communications/attachments/77/download');
  assert.equal(
    __testables.verifySignedAttachmentUrl({
      messageId: '77',
      objectKey,
      expiresAt: parsed.searchParams.get('expiresAt'),
      signature: parsed.searchParams.get('signature')
    }),
    true
  );
  assert.equal(
    __testables.verifySignedAttachmentUrl({
      messageId: '77',
      objectKey: 'appointments/123/chat/other.pdf',
      expiresAt: parsed.searchParams.get('expiresAt'),
      signature: parsed.searchParams.get('signature')
    }),
    false
  );
});

test('expired or tombstoned attachments render as unavailable placeholders', () => {
  const available = __testables.attachmentPresentationForMessage({
    id: 1n,
    messageType: 'file',
    storageObjectKey: 'appointments/1/chat/file.png',
    mediaRetentionUntil: new Date(Date.now() + 60_000),
    metadata: {}
  });
  assert.equal(available.attachmentAvailable, true);
  assert.ok(available.fileUrl);

  const expired = __testables.attachmentPresentationForMessage({
    id: 2n,
    messageType: 'file',
    storageObjectKey: 'appointments/1/chat/file.png',
    mediaRetentionUntil: new Date(Date.now() - 60_000),
    metadata: {}
  });
  assert.equal(expired.attachmentAvailable, false);
  assert.equal(expired.tombstoneReason, 'retention_expired');

  const deleted = __testables.attachmentPresentationForMessage({
    id: 3n,
    messageType: 'file',
    storageObjectKey: 'appointments/1/chat/file.png',
    mediaDeletedAt: new Date(),
    metadata: {}
  });
  assert.equal(deleted.attachmentAvailable, false);
  assert.equal(deleted.tombstoneReason, 'deleted');
});

test('attachment signed URL TTL is configurable and bounded', () => {
  process.env.COMM_ATTACHMENT_SIGNED_URL_TTL_SECONDS = '300';
  assert.equal(__testables.signedUrlTtlSeconds(), 300);

  process.env.COMM_ATTACHMENT_SIGNED_URL_TTL_SECONDS = '10';
  assert.equal(__testables.signedUrlTtlSeconds(), 60);

  process.env.COMM_ATTACHMENT_SIGNED_URL_TTL_SECONDS = '99999';
  assert.equal(__testables.signedUrlTtlSeconds(), 3600);

  delete process.env.COMM_ATTACHMENT_SIGNED_URL_TTL_SECONDS;
});
