import twilio from 'twilio';

class SmsAdapter {
  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKeySid = process.env.TWILIO_API_KEY_SID;
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
    
    // Fallback safely so the app doesn't crash during build without envs
    this.client = (accountSid && apiKeySid && apiKeySecret)
      ? twilio(apiKeySid, apiKeySecret, { accountSid })
      : null;
    this.fromNumber = process.env.TWILIO_SMS_FROM_NUMBER;
  }

  async sendSms(to, body) {
    if (!this.client) {
      console.warn('[SmsAdapter] Twilio Client not initialized due to missing TWILIO_ACCOUNT_SID or Twilio API key credentials.');
      return { messageSid: 'local-stub-sid' }; 
    }

    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(to)) {
      throw { code: 'INVALID_PHONE_FORMAT', message: 'Phone number must be in E.164 format (e.g., +62812...)' };
    }

    try {
      const message = await this.client.messages.create({
        from: this.fromNumber,
        to,
        body
      });

      return { messageSid: message.sid };
    } catch (error) {
      throw {
        code: 'SMS_DELIVERY_FAILED',
        message: error.message,
        twilioCode: error.code
      };
    }
  }
}

export default new SmsAdapter();
