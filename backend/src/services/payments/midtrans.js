import crypto from 'crypto';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || '';
const MIDTRANS_BASE_URL = process.env.MIDTRANS_BASE_URL || 'https://app.sandbox.midtrans.com';
const MIDTRANS_API_BASE_URL = process.env.MIDTRANS_API_BASE_URL || 'https://api.sandbox.midtrans.com';
const MIDTRANS_MOCK_MODE = (process.env.MIDTRANS_MOCK_MODE || '').toLowerCase() === 'true';

function buildAuthHeader() {
  if (MIDTRANS_MOCK_MODE) {
    return 'Basic mock';
  }
  if (!MIDTRANS_SERVER_KEY) {
    const error = new Error('MIDTRANS_CONFIG_MISSING');
    error.status = 500;
    throw error;
  }
  const token = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');
  return `Basic ${token}`;
}

export function getMidtransClientConfig() {
  if (MIDTRANS_MOCK_MODE) {
    return {
      clientKey: 'mock-client-key',
      baseUrl: 'mock'
    };
  }
  if (!MIDTRANS_CLIENT_KEY) return null;
  return {
    clientKey: MIDTRANS_CLIENT_KEY,
    baseUrl: MIDTRANS_BASE_URL
  };
}

export async function createMidtransTransaction({ paymentIntent, appointment, patient, orderId: overrideOrderId }) {
  if (MIDTRANS_MOCK_MODE) {
    const now = new Date();
    const orderId = overrideOrderId || `appointment-${appointment.id.toString()}-intent-${paymentIntent.id.toString()}`;
    return {
      providerOrderId: orderId,
      providerPaymentId: `mock-${paymentIntent.id.toString()}`,
      redirectUrl: `https://example.com/mock-payment/${paymentIntent.id.toString()}`,
      rawResponse: {
        token: `mock-token-${paymentIntent.id.toString()}`,
        transaction_id: `mock-${paymentIntent.id.toString()}`,
        expiry_time: new Date(now.getTime() + 30 * 60000).toISOString()
      },
      expiresAt: new Date(now.getTime() + 30 * 60000)
    };
  }

  const authHeader = buildAuthHeader();

  const orderId = overrideOrderId || `appointment-${appointment.id.toString()}-intent-${paymentIntent.id.toString()}`;
  const grossAmount = paymentIntent?.amount ?? appointment?.amount ?? 0;

  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount
    },
    customer_details: {
      first_name: patient?.name || 'Patient',
      email: patient?.email || undefined,
      phone: patient?.phone_number || undefined
    },
    item_details: [
      {
        id: appointment.id.toString(),
        price: grossAmount,
        quantity: 1,
        name: appointment.reason || 'Dental Appointment'
      }
    ],
    callbacks: {
      finish: process.env.MIDTRANS_FINISH_URL || undefined,
      error: process.env.MIDTRANS_ERROR_URL || undefined,
      pending: process.env.MIDTRANS_PENDING_URL || undefined
    }
  };

  const response = await fetch(`${MIDTRANS_BASE_URL}/snap/v1/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(`MIDTRANS_ERROR_${response.status}`);
    error.details = errorBody;
    throw error;
  }

  const data = await response.json();

  return {
    providerOrderId: orderId,
    providerPaymentId: data.token || data.transaction_id || orderId,
    redirectUrl: data.redirect_url || data.payment_url,
    rawResponse: data,
    expiresAt: data.expiry_time ? new Date(data.expiry_time) : null
  };
}

export async function refundMidtransTransaction({ orderId, amount, reason }) {
  if (MIDTRANS_MOCK_MODE) {
    return {
      status: 'mock_refund',
      order_id: orderId,
      amount,
      reason
    };
  }

  const authHeader = buildAuthHeader();
  const payload = {
    refund_key: `refund-${Date.now()}`,
    amount,
    reason
  };

  const response = await fetch(`${MIDTRANS_API_BASE_URL}/v2/${orderId}/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(`MIDTRANS_REFUND_ERROR_${response.status}`);
    error.details = errorBody;
    throw error;
  }

  return response.json();
}

export async function cancelMidtransTransaction(orderId) {
  if (MIDTRANS_MOCK_MODE) {
    return {
      status: 'mock_cancel',
      order_id: orderId
    };
  }

  const authHeader = buildAuthHeader();
  const response = await fetch(`${MIDTRANS_API_BASE_URL}/v2/${orderId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(`MIDTRANS_CANCEL_ERROR_${response.status}`);
    error.details = errorBody;
    throw error;
  }

  return response.json();
}

function timingSafeEqualHex(expected, provided) {
  if (!expected || !provided) return false;
  const expectedHex = String(expected).toLowerCase();
  const providedHex = String(provided).toLowerCase();
  if (expectedHex.length !== providedHex.length) return false;
  try {
    const expectedBuffer = Buffer.from(expectedHex, 'hex');
    const providedBuffer = Buffer.from(providedHex, 'hex');
    if (expectedBuffer.length !== providedBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (error) {
    return false;
  }
}

export function verifyMidtransSignature({ orderId, statusCode, grossAmount, signatureKey }) {
  if (MIDTRANS_MOCK_MODE) return true;
  if (!MIDTRANS_SERVER_KEY) return false;
  if (!orderId || !statusCode || !grossAmount || !signatureKey) return false;
  const payload = `${orderId}${statusCode}${grossAmount}${MIDTRANS_SERVER_KEY}`;
  const computedSignature = crypto.createHash('sha512').update(payload).digest('hex');
  return timingSafeEqualHex(computedSignature, signatureKey);
}

export function validateMidtransWebhookPayload(body) {
  if (!body || typeof body !== 'object') {
    const error = new Error('MIDTRANS_PAYLOAD_INVALID');
    error.status = 400;
    throw error;
  }

  const orderId = body.order_id;
  const statusCode = body.status_code;
  const grossAmount = body.gross_amount;
  const signatureKey = body.signature_key;
  const transactionStatus = body.transaction_status;
  const transactionId = body.transaction_id || null;

  if (!orderId || !statusCode || !grossAmount || !signatureKey || !transactionStatus) {
    const error = new Error('MIDTRANS_PAYLOAD_MISSING_FIELDS');
    error.status = 400;
    throw error;
  }

  const parsedAmount = Number(grossAmount);
  if (!Number.isFinite(parsedAmount)) {
    const error = new Error('MIDTRANS_GROSS_AMOUNT_INVALID');
    error.status = 400;
    throw error;
  }

  const parsedStatusCode = parseInt(statusCode, 10);
  if (Number.isNaN(parsedStatusCode)) {
    const error = new Error('MIDTRANS_STATUS_CODE_INVALID');
    error.status = 400;
    throw error;
  }

  return {
    orderId: String(orderId),
    statusCode: String(statusCode),
    grossAmount: String(grossAmount),
    grossAmountValue: Math.round(parsedAmount),
    signatureKey: String(signatureKey),
    transactionStatus: String(transactionStatus),
    transactionId: transactionId ? String(transactionId) : null
  };
}
