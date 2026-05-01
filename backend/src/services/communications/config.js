const REQUIRED_STANDARD_KEY_ENV = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_API_KEY_SID',
  'TWILIO_API_KEY_SECRET'
];

function missingEnv(keys, env = process.env) {
  return keys.filter((key) => !env[key]);
}

export function assertTwilioStandardKeyConfig(env = process.env) {
  const missing = missingEnv(REQUIRED_STANDARD_KEY_ENV, env);
  if (missing.length > 0) {
    const error = new Error('TWILIO_STANDARD_API_KEY_CONFIG_MISSING');
    error.status = 500;
    error.missing = missing;
    throw error;
  }
}

export function assertConversationsConfig(env = process.env) {
  assertTwilioStandardKeyConfig(env);
  const missing = missingEnv(['TWILIO_CONVERSATIONS_SERVICE_SID'], env);
  if (missing.length > 0) {
    const error = new Error('TWILIO_CONVERSATIONS_CONFIG_MISSING');
    error.status = 500;
    error.missing = missing;
    throw error;
  }
}

export function assertVerifyConfig(env = process.env) {
  const missing = missingEnv(['TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY_SID', 'TWILIO_API_KEY_SECRET', 'TWILIO_VERIFY_SERVICE_SID'], env);
  if (missing.length > 0) {
    const error = new Error('TWILIO_VERIFY_CONFIG_MISSING');
    error.status = 500;
    error.missing = missing;
    throw error;
  }
}

export function isWebhookSignatureRequired(env = process.env) {
  const runtime = String(env.APP_ENV || env.NODE_ENV || '').toLowerCase();
  return env.TWILIO_WEBHOOK_REQUIRE_SIGNATURE === 'true'
    || runtime === 'production'
    || runtime === 'staging';
}

export function getTwilioWebhookAuthToken(env = process.env) {
  if (!env.TWILIO_AUTH_TOKEN) {
    const error = new Error('TWILIO_WEBHOOK_AUTH_TOKEN_MISSING');
    error.status = 500;
    throw error;
  }
  return env.TWILIO_AUTH_TOKEN;
}

export function getTwilioStandardKeyConfig(env = process.env) {
  assertTwilioStandardKeyConfig(env);
  return {
    accountSid: env.TWILIO_ACCOUNT_SID,
    apiKeySid: env.TWILIO_API_KEY_SID,
    apiKeySecret: env.TWILIO_API_KEY_SECRET
  };
}

export function getConversationsServiceSid(env = process.env) {
  assertConversationsConfig(env);
  return env.TWILIO_CONVERSATIONS_SERVICE_SID;
}

export function getWebhookBaseUrl(env = process.env) {
  return (env.TWILIO_WEBHOOK_BASE_URL || env.API_BASE_URL || '').replace(/\/$/, '');
}
