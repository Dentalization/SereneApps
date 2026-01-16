import Twilio from 'twilio';

const { AccessToken } = Twilio.jwt;
const { VideoGrant } = AccessToken;

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_VIDEO_API_KEY_SID = process.env.TWILIO_VIDEO_API_KEY_SID || '';
const TWILIO_VIDEO_API_KEY_SECRET = process.env.TWILIO_VIDEO_API_KEY_SECRET || '';

function ensureVideoConfig() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_VIDEO_API_KEY_SID || !TWILIO_VIDEO_API_KEY_SECRET) {
    const error = new Error('TWILIO_VIDEO_CONFIG_MISSING');
    error.status = 500;
    throw error;
  }
}

export function buildTwilioVideoToken({ roomName, identity, expireSeconds = 3600 }) {
  if (!roomName) {
    const error = new Error('TWILIO_VIDEO_ROOM_REQUIRED');
    error.status = 400;
    throw error;
  }

  ensureVideoConfig();

  const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_VIDEO_API_KEY_SID, TWILIO_VIDEO_API_KEY_SECRET, {
    ttl: expireSeconds
  });

  token.identity = identity || `user-${Date.now()}`;
  token.addGrant(new VideoGrant({ room: roomName }));

  return token.toJwt();
}

export function isTwilioVideoConfigured() {
  try {
    ensureVideoConfig();
    return true;
  } catch (error) {
    return false;
  }
}