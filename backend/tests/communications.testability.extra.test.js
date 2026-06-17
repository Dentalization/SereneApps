import test from 'node:test';
import assert from 'node:assert/strict';
import {
  communicationActorRoleForAppointment,
  __testables,
} from '../src/services/communications.js';

test('communication actor role recognizes patient dentist invited participant and admin', () => {
  const appointment = {
    dentistId: 10n,
    patientId: 20n,
    communicationParticipants: [
      { userId: 30n, role: 'observer', status: 'verified' },
      { userId: 40n, role: 'assistant', status: 'pending' },
    ],
  };

  assert.equal(communicationActorRoleForAppointment({ id: '10', roles: [] }, appointment), 'dentist');
  assert.equal(communicationActorRoleForAppointment({ id: '20', roles: [] }, appointment), 'patient');
  assert.equal(communicationActorRoleForAppointment({ id: '30', roles: [] }, appointment), 'observer');
  assert.equal(communicationActorRoleForAppointment({ id: '40', roles: [] }, appointment), null);
  assert.equal(communicationActorRoleForAppointment({ id: '50', roles: ['admin'] }, appointment), 'admin');
});

test('observer communication token mode clamps ttl and normal mode preserves requested ttl', () => {
  assert.equal(__testables.normalizeCommunicationTokenMode({ role: 'observer' }), 'observer');
  assert.equal(__testables.normalizeCommunicationTokenMode({ mode: 'observer' }), 'observer');
  assert.equal(__testables.normalizeCommunicationTokenMode({ role: 'patient' }), null);

  assert.equal(__testables.clampCommunicationTokenTtl({ ttl: 86_400, mode: 'observer' }), 900);
  assert.equal(__testables.clampCommunicationTokenTtl({ ttl: 86_400, mode: null }), 86_400);
  assert.equal(__testables.clampCommunicationTokenTtl({ ttl: 'invalid', mode: null }), 3600);
});

test('waiting room reports ended state after appointment grace window', () => {
  const startsAt = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
  const endsAt = new Date(Date.now() - 2 * 60 * 60_000).toISOString();

  const waitingRoom = __testables.buildWaitingRoomState({
    status: 'confirmed',
    commStatus: 'ready',
    startsAt,
    endsAt,
  });

  assert.equal(waitingRoom.paymentReady, true);
  assert.equal(waitingRoom.state, 'ended');
  assert.equal(waitingRoom.canChat, true);
  assert.equal(waitingRoom.canJoinVideo, false);
});
