import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyClinicAppointmentSource,
  normalizeClinicPaymentChannel,
  resolveActiveClinicPayment
} from '../src/services/clinicPaymentWorkflow.js';

test('valid pending Midtrans payment is resumed instead of rejected', () => {
  const resolution = resolveActiveClinicPayment({
    provider: 'midtrans',
    status: 'requires_action',
    redirectUrl: 'https://app.sandbox.midtrans.com/snap/v4/redirection/example',
    expiresAt: new Date('2026-06-27T12:30:00.000Z')
  }, new Date('2026-06-27T12:00:00.000Z'));

  assert.equal(resolution.action, 'resume');
  assert.equal(resolution.reason, 'active_checkout_available');
});

test('stale pending Midtrans payment is replaced instead of returning INVOICE_HAS_ACTIVE_PAYMENT', () => {
  const missingLink = resolveActiveClinicPayment({
    provider: 'midtrans',
    status: 'requires_action',
    redirectUrl: null,
    expiresAt: new Date('2026-06-27T12:30:00.000Z')
  }, new Date('2026-06-27T12:00:00.000Z'));
  const expired = resolveActiveClinicPayment({
    provider: 'midtrans',
    status: 'requires_action',
    redirectUrl: 'https://example.test/pay',
    expiresAt: new Date('2026-06-27T11:59:59.000Z')
  }, new Date('2026-06-27T12:00:00.000Z'));

  assert.equal(missingLink.action, 'replace');
  assert.equal(missingLink.reason, 'checkout_link_missing');
  assert.equal(expired.action, 'replace');
  assert.equal(expired.reason, 'checkout_expired');
});

test('clinic payment channels expose patient-facing methods, not the processor name', () => {
  assert.deepEqual(normalizeClinicPaymentChannel('qris'), {
    id: 'qris',
    provider: 'midtrans',
    enabledPayments: ['gopay']
  });
  assert.deepEqual(normalizeClinicPaymentChannel('bank_transfer'), {
    id: 'bank_transfer',
    provider: 'midtrans',
    enabledPayments: ['bank_transfer']
  });
  assert.throws(() => normalizeClinicPaymentChannel('midtrans'), /PAYMENT_CHANNEL_UNSUPPORTED/);
});

test('walk-in and mobile appointments are classified from appointment metadata', () => {
  assert.equal(classifyClinicAppointmentSource({
    metadata: { source: 'clinic_walk_in' }
  }), 'clinic_walk_in');
  assert.equal(classifyClinicAppointmentSource({
    metadata: { source: 'clinic_created' }
  }), 'clinic_walk_in');
  assert.equal(classifyClinicAppointmentSource({
    metadata: { source: 'mobile' }
  }), 'patient_mobile');
  assert.equal(classifyClinicAppointmentSource({ metadata: null }), 'patient_mobile');
});
