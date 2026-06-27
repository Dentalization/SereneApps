const ACTIVE_STATUSES = new Set(['pending', 'requires_action', 'paid']);
const WALK_IN_SOURCES = new Set([
  'clinic_added',
  'clinic_billing',
  'clinic_created',
  'clinic_walk_in',
  'walk_in'
]);

export function normalizeClinicPaymentChannel(value) {
  const channel = String(value || '').trim().toLowerCase();
  if (channel === 'qris') {
    return {
      id: 'qris',
      provider: 'midtrans',
      enabledPayments: ['gopay']
    };
  }
  if (['bank_transfer', 'transfer', 'virtual_account', 'va'].includes(channel)) {
    return {
      id: 'bank_transfer',
      provider: 'midtrans',
      enabledPayments: ['bank_transfer']
    };
  }

  const error = new Error('PAYMENT_CHANNEL_UNSUPPORTED');
  error.status = 400;
  throw error;
}

export function resolveActiveClinicPayment(intent, now = new Date()) {
  if (!intent || !ACTIVE_STATUSES.has(String(intent.status || '').toLowerCase())) {
    return { action: 'create', reason: 'no_active_payment' };
  }

  const status = String(intent.status).toLowerCase();
  const provider = String(intent.provider || '').toLowerCase();
  if (provider === 'midtrans' && ['pending', 'requires_action'].includes(status)) {
    if (!intent.redirectUrl) {
      return { action: 'replace', reason: 'checkout_link_missing' };
    }
    if (intent.expiresAt && new Date(intent.expiresAt).getTime() <= now.getTime()) {
      return { action: 'replace', reason: 'checkout_expired' };
    }
    return { action: 'resume', reason: 'active_checkout_available' };
  }

  return { action: 'block', reason: 'payment_processing_or_paid' };
}

export function classifyClinicAppointmentSource(appointment) {
  const metadata = appointment?.metadata && typeof appointment.metadata === 'object'
    ? appointment.metadata
    : {};
  const source = String(
    metadata.source
    || metadata.patientSource
    || metadata.channel
    || ''
  ).toLowerCase();

  return WALK_IN_SOURCES.has(source) ? 'clinic_walk_in' : 'patient_mobile';
}
