import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables } from '../src/services/communications/participantAccessService.js';

test('invite token hashing never preserves the raw token', () => {
  const rawToken = 'raw-invite-token-example';
  const hash = __testables.hashInviteToken(rawToken, 'test-secret');

  assert.notEqual(hash, rawToken);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash, __testables.hashInviteToken(rawToken, 'test-secret'));
});

test('participant identity remains appointment-scoped for guest access', () => {
  const identity = __testables.buildParticipantIdentity({
    appointmentId: 123n,
    participantId: '00000000-0000-0000-0000-000000000123',
    role: 'guardian'
  });
  const parsed = __testables.parseParticipantIdentity(identity);

  assert.equal(identity, 'appointment-123:participant-00000000-0000-0000-0000-000000000123:guardian');
  assert.equal(parsed.type, 'communication_participant');
  assert.equal(parsed.appointmentId, 123n);
  assert.equal(parsed.role, 'guardian');
});

test('linked account participant identity stays compatible with existing Twilio user identity', () => {
  const identity = __testables.buildParticipantIdentity({
    appointmentId: 123n,
    participantId: '00000000-0000-0000-0000-000000000123',
    role: 'interpreter',
    userId: 88n
  });

  assert.equal(identity, '88');
  assert.deepEqual(__testables.parseParticipantIdentity(identity), { type: 'user', userId: 88n });
});
