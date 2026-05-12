import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.resolve(root, file), 'utf8');

test('dentist teledentistry portal fetches and renders patient pre-session health form', () => {
  const service = read('src/services/chatService.js');
  const page = read('src/pages/dentist-portal/teledentistry/index.jsx');
  const panel = read('src/pages/dentist-portal/teledentistry/components/PatientInfoPanel.jsx');

  assert.match(service, /fetchPreSessionHealthForm/);
  assert.match(service, /\/appointments\/\$\{appointmentId\}\/pre-session-health-form/);
  assert.match(page, /fetchPreSessionHealthForm\(activeAppointmentId\)/);
  assert.match(page, /preSessionHealthForm=\{preSessionHealthForm\}/);
  assert.match(panel, /PreSessionHealthFormCard/);
  assert.match(panel, /Pasien belum mengisi form pra-sesi/);
  assert.match(panel, /Form ini opsional/);
  assert.match(panel, /Keluhan utama/);
  assert.match(panel, /Skala nyeri/);
  assert.match(panel, /Obat yang dikonsumsi/);
});

test('dentist teledentistry dashboard surfaces today sessions and pre-session actions', () => {
  const dashboard = read('src/pages/dentist-portal/teledentistry/SessionDashboard.jsx');
  const page = read('src/pages/dentist-portal/teledentistry/index.jsx');

  assert.match(dashboard, /Dashboard Sesi Hari Ini/);
  assert.match(dashboard, /Mulai Chat/);
  assert.match(dashboard, /Mulai Video/);
  assert.match(dashboard, /ClipboardCheck/);
  assert.match(page, /SessionDashboard/);
  assert.match(page, /handleDashboardStartVideo/);
  assert.match(page, /handleDashboardViewPreSession/);
});
