import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashWebhookPayload,
  normalizeWebhookHeaders
} from '../src/services/webhooks/idempotency.js';

test('webhook payload hashes are stable for replay and change on mismatch', () => {
  const first = hashWebhookPayload({ MessageSid: 'IM123', Body: 'hello' });
  const replay = hashWebhookPayload({ MessageSid: 'IM123', Body: 'hello' });
  const mismatch = hashWebhookPayload({ MessageSid: 'IM123', Body: 'tampered' });

  assert.equal(first, replay);
  assert.notEqual(first, mismatch);
});

test('webhook header normalization preserves scalar values and joins arrays', () => {
  const headers = normalizeWebhookHeaders({
    'x-twilio-signature': 'sig',
    'x-forwarded-for': ['1.1.1.1', '2.2.2.2'],
    missing: undefined
  });

  assert.equal(headers['x-twilio-signature'], 'sig');
  assert.equal(headers['x-forwarded-for'], '1.1.1.1,2.2.2.2');
  assert.equal(headers.missing, null);
});
