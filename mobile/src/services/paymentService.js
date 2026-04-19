import api from './api';

export async function createSnapTransaction(appointmentId) {
  try {
    const response = await api.post('/payments/snap-transactions', { appointmentId });
    return response.data; // { snapToken, redirectUrl, paymentIntentId }
  } catch (error) {
    const errObj = error.response?.data?.error || {
      code: 'PAYMENT_INIT_ERROR',
      message: error.message || 'Failed to initialize payment',
      retryable: true
    };
    throw errObj;
  }
}

export async function getPaymentStatus(paymentIntentId) {
  try {
    const response = await api.get(`/payments/${paymentIntentId}/status`);
    return response.data; // { status } -> 'pending' | 'succeeded' | 'failed'
  } catch (error) {
    const errObj = error.response?.data?.error || {
      code: 'PAYMENT_STATUS_ERROR',
      message: error.message || 'Failed to fetch payment status',
      retryable: true
    };
    throw errObj;
  }
}
export async function reconcilePayment(paymentIntentId) {
  try {
    const response = await api.post(`/payments/${paymentIntentId}/reconcile`);
    return response.data; // { reconciled, previousStatus, newStatus }
  } catch (error) {
    const errObj = error.response?.data?.error || {
      code: 'PAYMENT_RECONCILE_ERROR',
      message: error.message || 'Failed to reconcile payment',
      retryable: true
    };
    throw errObj;
  }
}
