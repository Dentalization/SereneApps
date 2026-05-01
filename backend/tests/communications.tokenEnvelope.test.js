import test from 'node:test';
import assert from 'node:assert/strict';

process.env.TWILIO_ACCOUNT_SID = 'AC00000000000000000000000000000000';
process.env.TWILIO_API_KEY_SID = 'SK00000000000000000000000000000000';
process.env.TWILIO_API_KEY_SECRET = 'test-api-key-secret';
process.env.TWILIO_CONVERSATIONS_SERVICE_SID = 'IS00000000000000000000000000000000';

const { __testables } = await import('../src/services/communications.js');

function decodeJwtPayload(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
}

test('combined token includes Conversations and Video grants without auth token', () => {
  delete process.env.TWILIO_AUTH_TOKEN;

  const { token, expiresAt } = __testables.buildCombinedTwilioToken({
    identity: '42',
    roomName: 'appointment-99',
    ttl: 600
  });
  const payload = decodeJwtPayload(token);

  assert.ok(expiresAt);
  assert.equal(payload.grants.identity, '42');
  assert.equal(payload.grants.chat.service_sid, process.env.TWILIO_CONVERSATIONS_SERVICE_SID);
  assert.equal(payload.grants.video.room, 'appointment-99');
  assert.equal(payload.iss, process.env.TWILIO_API_KEY_SID);
  assert.equal(payload.sub, process.env.TWILIO_ACCOUNT_SID);
});

test('observer token can be constrained to a video-only grant', () => {
  const { token } = __testables.buildCombinedTwilioToken({
    identity: 'appointment-99-observer-42',
    roomName: 'appointment-99',
    ttl: 600,
    includeConversations: false
  });
  const payload = decodeJwtPayload(token);

  assert.equal(payload.grants.identity, 'appointment-99-observer-42');
  assert.equal(payload.grants.video.room, 'appointment-99');
  assert.equal(payload.grants.chat, undefined);
});

test('observer token mode accepts role or mode and clamps ttl to 15 minutes', () => {
  assert.equal(__testables.normalizeCommunicationTokenMode({ role: 'observer' }), 'observer');
  assert.equal(__testables.normalizeCommunicationTokenMode({ mode: 'observer' }), 'observer');
  assert.equal(__testables.normalizeCommunicationTokenMode({ role: 'dentist' }), null);
  assert.equal(__testables.clampCommunicationTokenTtl({ ttl: 999999, mode: 'observer' }), 900);
  assert.equal(__testables.clampCommunicationTokenTtl({ ttl: 600, mode: 'observer' }), 600);
});
