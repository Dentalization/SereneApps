import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables } from '../src/routes/payments/snapTransactions.js';

test('snap transaction response includes expiry and serializes bigint ids', () => {
  const expiresAt = new Date('2026-05-12T08:00:00.000Z');
  const response = __testables.buildSnapResponse({
    id: 42n,
    redirectUrl: 'https://snap.example/pay',
    metadata: { snapToken: 'snap-token' },
    expiresAt
  });

  assert.equal(response.paymentIntentId, '42');
  assert.equal(response.snapToken, 'snap-token');
  assert.equal(response.redirectUrl, 'https://snap.example/pay');
  assert.equal(response.expiresAt, expiresAt.toISOString());
});

test('pending snap intent is reusable until it expires', () => {
  const active = {
    status: 'pending',
    expiresAt: new Date(Date.now() + 60_000),
    metadata: { snapToken: 'token' },
    redirectUrl: 'https://snap.example/pay'
  };
  const expired = {
    status: 'pending',
    expiresAt: new Date(Date.now() - 60_000),
    metadata: { snapToken: 'token' },
    redirectUrl: 'https://snap.example/pay'
  };

  assert.equal(__testables.canReuseSnapIntent(active), true);
  assert.equal(__testables.canReuseSnapIntent(expired), false);
  assert.equal(__testables.canReuseSnapIntent({ ...active, status: 'failed' }), false);
});

test('snap expiry defaults to fifteen minutes when provider omits expiry', () => {
  const now = new Date('2026-05-12T08:00:00.000Z');
  const expiry = __testables.resolveSnapExpiry(null, now);
  assert.equal(expiry.toISOString(), '2026-05-12T08:15:00.000Z');
});
