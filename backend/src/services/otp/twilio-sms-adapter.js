import twilio from 'twilio';

function isTruthy(value) {
  return String(value || '').toLowerCase() === 'true';
}

export function createTwilioSmsAdapter(env = process.env) {
  const accountSid = env.TWILIO_ACCOUNT_SID || '';
  const authToken = env.TWILIO_AUTH_TOKEN || '';
  const fromNumber = env.TWILIO_SMS_FROM_NUMBER || env.TWILIO_PHONE_NUMBER || '';
  const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

  async function sendOtpSms({ to, body }) {
    if (!client) {
      if (env.NODE_ENV === 'production') {
        const error = new Error('OTP_PROVIDER_MISCONFIGURED');
        error.code = 'OTP_PROVIDER_MISCONFIGURED';
        throw error;
      }

      return {
        provider: 'twilio-mock',
        sid: null,
        delivered: false,
        mode: isTruthy(env.OTP_DEV_RETURN_CODE) ? 'mock-return-code' : 'mock-noop'
      };
    }

    if (!fromNumber) {
      const error = new Error('OTP_PROVIDER_MISCONFIGURED');
      error.code = 'OTP_PROVIDER_MISCONFIGURED';
      throw error;
    }

    const response = await client.messages.create({
      body,
      from: fromNumber,
      to
    });

    return {
      provider: 'twilio',
      sid: response.sid,
      delivered: true,
      mode: 'live'
    };
  }

  return {
    isConfigured: () => Boolean(client && fromNumber),
    sendOtpSms
  };
}

export const twilioSmsOtpAdapter = createTwilioSmsAdapter();
