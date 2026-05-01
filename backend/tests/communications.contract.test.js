import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appointmentScopedRoomName,
  chatChannelNameForAppointment,
  parseAppointmentIdFromRoomName,
  videoRoomNameForAppointment
} from '../src/services/communications/naming.js';
import { __testables } from '../src/services/communications.js';

test('uses one appointment-scoped room name for chat and video resources', () => {
  assert.equal(appointmentScopedRoomName(123n), 'appointment-123');
  assert.equal(chatChannelNameForAppointment('123'), 'appointment-123');
  assert.equal(videoRoomNameForAppointment(123), 'appointment-123');
  assert.equal(parseAppointmentIdFromRoomName('appointment-123'), '123');
  assert.equal(parseAppointmentIdFromRoomName('video_123'), null);
});

test('waiting room blocks unpaid appointments and opens around appointment time', () => {
  const startsAt = new Date(Date.now() + 5 * 60_000);
  const endsAt = new Date(Date.now() + 35 * 60_000);

  const pending = __testables.buildWaitingRoomState({
    status: 'scheduled',
    commStatus: 'pending',
    startsAt,
    endsAt
  });
  assert.equal(pending.paymentReady, false);
  assert.equal(pending.canChat, false);
  assert.equal(pending.canJoinVideo, false);

  const ready = __testables.buildWaitingRoomState({
    status: 'confirmed',
    commStatus: 'ready',
    startsAt,
    endsAt
  });
  assert.equal(ready.paymentReady, true);
  assert.equal(ready.canChat, true);
  assert.equal(ready.canJoinVideo, true);
});

test('communication audit metadata strips secrets and serializes dates', () => {
  const sanitized = __testables.sanitizeEventMetadata({
    inviteToken: 'raw-token',
    expiresAt: new Date('2026-05-01T00:00:00.000Z'),
    nested: {
      value: 7n,
      safe: 'ok'
    }
  });

  assert.equal(sanitized.inviteToken, undefined);
  assert.equal(sanitized.expiresAt, '2026-05-01T00:00:00.000Z');
  assert.equal(sanitized.nested.value, '7');
  assert.equal(sanitized.nested.safe, 'ok');
});
