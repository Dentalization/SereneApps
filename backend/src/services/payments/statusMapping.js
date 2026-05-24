import { PAYMENT_STATUSES } from './status.js';

export function mapMidtransStatus({ transactionStatus, fraudStatus }) {
  const status = (transactionStatus || '').toLowerCase();
  const fraud = (fraudStatus || '').toLowerCase();

  if (status === 'capture') {
    if (fraud === 'challenge') {
      return { internalStatus: PAYMENT_STATUSES.REQUIRES_ACTION, failureReason: 'fraud_challenge' };
    }
    if (fraud === 'accept' || !fraud) {
      return { internalStatus: PAYMENT_STATUSES.PAID };
    }
  }

  if (status === 'settlement') {
    return { internalStatus: PAYMENT_STATUSES.SETTLED };
  }

  if (status === 'pending') {
    return { internalStatus: PAYMENT_STATUSES.PENDING };
  }

  if (status === 'deny') {
    return { internalStatus: PAYMENT_STATUSES.FAILED, failureReason: 'deny' };
  }

  if (status === 'cancel') {
    return { internalStatus: PAYMENT_STATUSES.CANCELLED, failureReason: 'cancel' };
  }

  if (status === 'expire') {
    return { internalStatus: PAYMENT_STATUSES.EXPIRED, failureReason: 'expire' };
  }

  if (status === 'refund') {
    return { internalStatus: PAYMENT_STATUSES.REFUNDED, failureReason: 'refund' };
  }

  if (status === 'partial_refund') {
    return { internalStatus: PAYMENT_STATUSES.PARTIAL_REFUND, failureReason: 'partial_refund' };
  }

  if (status === 'authorize') {
    return { internalStatus: PAYMENT_STATUSES.REQUIRES_ACTION };
  }

  return { internalStatus: PAYMENT_STATUSES.FAILED, failureReason: status || 'unknown' };
}
