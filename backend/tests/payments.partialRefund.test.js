import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables } from '../src/services/payments/status.js';

test('partial refund uses explicit refund_amount instead of full payment amount', () => {
  assert.equal(
    __testables.resolveRefundAmount({ refund_amount: '50000.00' }, 500000),
    50000
  );
});

test('partial refund uses camelCase refundAmount from provider response', () => {
  assert.equal(
    __testables.resolveRefundAmount({ refundAmount: 125000 }, 500000),
    125000
  );
});

test('partial refund sums provider refund_amounts array when supplied', () => {
  assert.equal(
    __testables.resolveRefundAmount({
      refund_amounts: [
        { amount: '25000.00' },
        { amount: 75000 }
      ]
    }, 500000),
    100000
  );
});

test('full refund falls back to payment amount when provider gives no refund amount', () => {
  assert.equal(
    __testables.resolveRefundAmount({}, 500000),
    500000
  );
});

test('refund amount is clamped to payment amount to avoid overstated ledger debits', () => {
  assert.equal(
    __testables.resolveRefundAmount({ refund_amount: 999999 }, 500000),
    500000
  );
});
