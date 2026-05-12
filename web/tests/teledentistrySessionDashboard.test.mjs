import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.resolve(root, file), 'utf8');

test('session dashboard uses appointment keyed presence and stable identity matching', () => {
  const dashboard = read('src/pages/dentist-portal/teledentistry/SessionDashboard.jsx');

  assert.match(dashboard, /function identityMatchesUser/);
  assert.match(dashboard, /presenceMap\?\.\[appointmentId\]/);
  assert.doesNotMatch(dashboard, /presenceMap\?\.\[patientId\]/);
  assert.match(dashboard, /identity\.includes\(`user-\$\{target\}`\)/);
  assert.match(dashboard, /identity\.includes\(`user:\$\{target\}`\)/);
});

test('session dashboard renders localized status labels and non-distracting live indicator', () => {
  const dashboard = read('src/pages/dentist-portal/teledentistry/SessionDashboard.jsx');

  assert.match(dashboard, /statusLabels/);
  assert.match(dashboard, /teledentistry\.dashboard\.status\.live/);
  assert.match(dashboard, /Menunggu/);
  assert.match(dashboard, /Akan Datang/);
  assert.match(dashboard, /Selesai/);
  assert.match(dashboard, /animate-ping/);
  assert.doesNotMatch(dashboard, /status === 'live' \? 'animate-pulse'/);
});

test('session dashboard supports empty and skeleton states while keeping checklist routing', () => {
  const dashboard = read('src/pages/dentist-portal/teledentistry/SessionDashboard.jsx');
  const page = read('src/pages/dentist-portal/teledentistry/index.jsx');

  assert.match(dashboard, /loading = false/);
  assert.match(dashboard, /Tidak ada sesi hari ini/);
  assert.match(dashboard, /Dashboard Sesi Hari Ini/);
  assert.match(page, /preCallAppointmentId/);
  assert.match(page, /handleStartVideoCall\(appointmentId\)/);
  assert.match(page, /onStartVideo=\{handleDashboardStartVideo\}/);
});
