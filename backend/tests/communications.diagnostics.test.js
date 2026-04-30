import test from 'node:test';
import assert from 'node:assert/strict';
import { appointmentScopedRoomName } from '../src/services/communications/naming.js';
import { __testables } from '../src/services/communications/diagnosticsService.js';

test('diagnostics metadata redacts secrets recursively', () => {
  const redacted = __testables.redactDiagnosticsMetadata({
    token: 'jwt',
    nested: {
      apiKeySecret: 'secret',
      roomName: appointmentScopedRoomName(44)
    },
    safe: 'visible'
  });

  assert.equal(redacted.token, '[redacted]');
  assert.equal(redacted.nested.apiKeySecret, '[redacted]');
  assert.equal(redacted.nested.roomName, 'appointment-44');
  assert.equal(redacted.safe, 'visible');
});

test('diagnostics identifies room naming and projection mismatches', () => {
  const issues = __testables.detectInconsistencies({
    appointment: {
      id: 7n,
      commStatus: 'ready',
      chatRoom: { channelName: 'legacy-room', twilio_conversation_sid: null },
      videoRoomRef: 'appointment-7',
      video_room_sid: null
    },
    projection: {
      messagesMissingTwilioSid: 1,
      expiredAttachmentCount: 0
    }
  });

  assert.ok(issues.some((issue) => issue.code === 'chat_room_name_mismatch'));
  assert.ok(issues.some((issue) => issue.code === 'missing_conversation_sid'));
  assert.ok(issues.some((issue) => issue.code === 'missing_video_room_sid'));
  assert.ok(issues.some((issue) => issue.code === 'messages_missing_twilio_sid'));
});
