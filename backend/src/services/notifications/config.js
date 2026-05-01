import { parseIntSafe } from './utils.js';

const MAX_ATTEMPTS_DEFAULT = 5;
const RETRY_SECONDS_DEFAULT = 300;

function parseServiceAccount(jsonString) {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Invalid FCM service account JSON provided; ignoring configuration.');
    return null;
  }
}

function decodeApnsKey(base64Key) {
  if (!base64Key) return null;
  try {
    return Buffer.from(base64Key, 'base64').toString('utf8');
  } catch (error) {
    console.warn('APNS key decode failed:', error);
    return null;
  }
}

export const notificationConfig = {
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL || 'no-reply@sereneai.test',
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    apiKeySid: process.env.TWILIO_API_KEY_SID || '',
    apiKeySecret: process.env.TWILIO_API_KEY_SECRET || '',
    fromNumber: process.env.TWILIO_SMS_FROM_NUMBER || process.env.TWILIO_FROM_NUMBER || ''
  },
  fcm: {
    serviceAccount: parseServiceAccount(process.env.FCM_SERVICE_ACCOUNT_JSON || '')
  },
  apns: {
    enabled: (process.env.APNS_ENABLED || 'false').toLowerCase() === 'true',
    keyId: process.env.APNS_KEY_ID || '',
    teamId: process.env.APNS_TEAM_ID || '',
    bundleId: process.env.APNS_BUNDLE_ID || '',
    privateKey: decodeApnsKey(process.env.APNS_KEY_BASE64 || '')
  },
  queue: {
    maxAttempts: parseIntSafe(process.env.NOTIFICATION_MAX_ATTEMPTS, MAX_ATTEMPTS_DEFAULT),
    retrySeconds: parseIntSafe(process.env.NOTIFICATION_RETRY_SECONDS, RETRY_SECONDS_DEFAULT)
  }
};

export function isPushConfigured() {
  return Boolean(notificationConfig.fcm.serviceAccount);
}

export function isEmailConfigured() {
  return Boolean(notificationConfig.sendgridApiKey);
}

export function isSmsConfigured() {
  const { accountSid, apiKeySid, apiKeySecret, fromNumber } = notificationConfig.twilio;
  return Boolean(accountSid && apiKeySid && apiKeySecret && fromNumber);
}
