import Twilio from 'twilio';
import { getTwilioStandardKeyConfig } from './communications/config.js';

const { AccessToken } = Twilio.jwt;
const { VideoGrant } = AccessToken;

function ensureVideoConfig() {
  try {
    return getTwilioStandardKeyConfig();
  } catch (err) {
    const error = new Error('TWILIO_VIDEO_CONFIG_MISSING');
    error.status = 500;
    error.missing = err.missing;
    throw error;
  }
}

export function buildTwilioVideoToken({ roomName, identity, expireSeconds = 3600 }) {
  if (!roomName) {
    const error = new Error('TWILIO_VIDEO_ROOM_REQUIRED');
    error.status = 400;
    throw error;
  }

  const config = ensureVideoConfig();

  const token = new AccessToken(config.accountSid, config.apiKeySid, config.apiKeySecret, {
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
