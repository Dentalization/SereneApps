import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { templates } from '../src/services/notifications/templates.js';
import { sendExpoPushNotification } from '../src/services/notifications/providers/push.js';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.resolve(root, file), 'utf8');

test('pre-session health form model and appointment endpoints are present', () => {
  const schema = read('prisma/schema.prisma');
  const routes = read('src/routes/appointments.js');

  assert.match(schema, /model AppointmentPreSessionHealthForm/);
  assert.match(schema, /appointment_pre_session_health_forms/);
  assert.match(routes, /\/:appointmentId\/pre-session-health-form/);
  assert.match(routes, /normalizeHealthFormPayload/);
  assert.match(routes, /invalid_pain_level/);
  assert.match(routes, /required:\s*false/);
  assert.doesNotMatch(routes, /health_form_required/);
});

test('appointment reminder template can deep-link patient into teledentistry session', () => {
  const payloads = templates.appointment_reminder.build({
    appointment: {
      id: 88n,
      startsAt: new Date('2026-05-12T09:00:00.000Z'),
      patient: { name: 'Patient' },
      dentist: { name: 'Dr. Budi' },
    },
    recipientRole: 'patient',
    payload: {
      leadTimeLabel: 'dalam 15 menit',
      joinAvailable: true,
    },
  });

  assert.equal(payloads.push.title, 'Konsultasi dimulai sebentar lagi');
  assert.equal(payloads.push.data.screen, 'PatientTeledentistry');
  assert.equal(payloads.push.data.appointment_id, '88');
  assert.equal(payloads.push.data.dentist_name, 'Dr. Budi');
});

test('Expo push provider sends batched Expo push messages', async () => {
  const originalFetch = globalThis.fetch;
  const sentBodies = [];
  globalThis.fetch = async (_url, options) => {
    sentBodies.push(JSON.parse(options.body));
    return {
      ok: true,
      async json() {
        return { data: [{ status: 'ok', id: 'ticket-1' }] };
      }
    };
  };

  try {
    const result = await sendExpoPushNotification({
      tokens: ['ExponentPushToken[test]'],
      notification: {
        title: 'Reminder',
        body: 'Tap to join',
      },
      data: {
        appointment_id: '88',
      },
    });

    assert.equal(result.success, 1);
    assert.equal(sentBodies[0][0].to, 'ExponentPushToken[test]');
    assert.equal(sentBodies[0][0].data.appointment_id, '88');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
