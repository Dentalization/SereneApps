import crypto from 'crypto';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || '';
const MIDTRANS_BASE_URL = process.env.MIDTRANS_BASE_URL || 'https://app.sandbox.midtrans.com';
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

export async function createMidtransTransaction({ paymentIntent, appointment, patient }) {
  if (MIDTRANS_MOCK_MODE) {
    const now = new Date();
    return {
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

  const orderId = `appointment-${appointment.id.toString()}-intent-${paymentIntent.id.toString()}`;
  const grossAmount = paymentIntent.amount;

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
    providerPaymentId: data.token || data.transaction_id || orderId,
    redirectUrl: data.redirect_url || data.payment_url,
    rawResponse: data,
    expiresAt: data.expiry_time ? new Date(data.expiry_time) : null
  };
}

export function verifyMidtransSignature({ orderId, statusCode, grossAmount, signatureKey }) {
  if (MIDTRANS_MOCK_MODE) return true;
  if (!MIDTRANS_SERVER_KEY) return false;
  const payload = orderId + statusCode + grossAmount + MIDTRANS_SERVER_KEY;
  const computedSignature = crypto.createHash('sha512').update(payload).digest('hex');
  return computedSignature === signatureKey;
}
