import twilio from 'twilio';
import { assertVerifyConfig } from '../communications/config.js';

function isTruthy(value) {
  return String(value || '').toLowerCase() === 'true';
}

export function createTwilioSmsAdapter(env = process.env) {
  const accountSid = env.TWILIO_ACCOUNT_SID || '';
  const fromNumber = env.TWILIO_SMS_FROM_NUMBER || env.TWILIO_PHONE_NUMBER || '';
  const verifyServiceSid = env.TWILIO_VERIFY_SERVICE_SID || '';
  const client = accountSid && env.TWILIO_API_KEY_SID && env.TWILIO_API_KEY_SECRET
    ? twilio(env.TWILIO_API_KEY_SID, env.TWILIO_API_KEY_SECRET, { accountSid })
    : null;

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

  async function sendVerifyOtp(to, channel = 'sms') {
    assertVerifyConfig(env);

    const verification = await client.verify.v2.services(verifyServiceSid)
      .verifications
      .create({ to, channel });

    return {
      sid: verification.sid,
      status: verification.status
    };
  }

  async function checkVerifyOtp(to, code) {
    assertVerifyConfig(env);

    const check = await client.verify.v2.services(verifyServiceSid)
      .verificationChecks
      .create({ to, code });

    return {
      status: check.status,
      valid: check.status === 'approved'
    };
  }

  return {
    isConfigured: () => Boolean(client && fromNumber),
    isVerifyConfigured: () => Boolean(client && verifyServiceSid),
    sendOtpSms,
    sendVerifyOtp,
    checkVerifyOtp
  };
}

export const twilioSmsOtpAdapter = createTwilioSmsAdapter();
