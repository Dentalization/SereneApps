import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.resolve(root, file), 'utf8');

test('patient teledentistry keeps pre-session health form optional', () => {
  const source = read('src/features/appointment/screens/PatientTeledentistryScreen.jsx');
  const hook = read('src/hooks/useChat.js');

  assert.match(source, /getPreSessionHealthForm/);
  assert.match(source, /savePreSessionHealthForm/);
  assert.doesNotMatch(source, /preSessionReady/);
  assert.match(source, /selectConversation\(appointmentId\.toString\(\)\)/);
  assert.match(source, /Form kesehatan opsional/);
  assert.match(source, /Boleh dilewati/);
  assert.match(source, /Lewati dulu/);
  assert.match(source, /renderPreSessionHealthForm/);
  assert.doesNotMatch(source, /Isi form kesehatan pra-sesi sebelum bergabung ke video call/);
  assert.match(hook, /sendAttachmentMessage[\s\S]*setReconnectError[\s\S]*throw error/);
});

test('mobile chat hook publishes and renders Twilio typing indicators', () => {
  const hook = read('src/hooks/useChat.js');
  const screen = read('src/features/appointment/screens/PatientTeledentistryScreen.jsx');

  assert.match(hook, /typingStarted/);
  assert.match(hook, /typingEnded/);
  assert.match(hook, /conversation\.typing\(\)/);
  assert.match(hook, /typingParticipants/);
  assert.match(screen, /Dokter sedang mengetik/);
  assert.match(screen, /sendTypingIndicator/);
});

test('appointment list supports push registration, swipe actions, and smart rebooking', () => {
  const source = read('src/features/appointment/screens/AppointmentListScreen.jsx');
  const pushService = read('src/services/pushNotificationService.js');

  assert.match(source, /registerAppointmentReminderPushToken/);
  assert.match(source, /Swipeable/);
  assert.match(source, /Pesan Lagi/);
  assert.match(source, /rebookingFromAppointmentId/);
  assert.match(pushService, /provider:\s*'expo'/);
  assert.match(pushService, /PatientTeledentistry/);
});
