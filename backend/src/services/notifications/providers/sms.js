import twilio from 'twilio';
import { isSmsConfigured, notificationConfig } from '../config.js';

let client = null;

function getClient() {
  if (client || !isSmsConfigured()) return client;
  const { accountSid, authToken } = notificationConfig.twilio;
  client = twilio(accountSid, authToken);
  return client;
}

export async function sendSmsNotification({ to, body }) {
  if (!isSmsConfigured()) {
    throw new Error('SMS notifications are not configured');
  }

  const twilioClient = getClient();
  await twilioClient.messages.create({
    body,
    from: notificationConfig.twilio.fromNumber,
    to
  });
  return { success: true };
}
