import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const readSource = (relativePath) =>
  fs.readFileSync(path.resolve(here, '..', relativePath), 'utf8');

test('dentist UI preserves backend appointment status', () => {
  const schedule = readSource('src/pages/dentist-portal/schedule/index.jsx');
  const appointments = readSource(
    'src/pages/dentist-portal/patient/components/PatientAppointment.jsx'
  );

  assert.doesNotMatch(schedule, /isPast24h/);
  assert.doesNotMatch(appointments, /isPast24h/);
});

test('patient actions are implemented and realtime refresh listens to domain events', () => {
  const source = readSource('src/pages/dentist-portal/patient/index.jsx');
  const collaboration = readSource('src/collaboration/portalCollaboration.mjs');

  assert.doesNotMatch(source, /const handleScheduleNew = \(\) => \{\};/);
  assert.doesNotMatch(source, /const handleUpdateAppointment = .*=> \{\};/);
  assert.doesNotMatch(source, /const handleCancelAppointment = .*=> \{\};/);
  assert.doesNotMatch(source, /const handleSendStatement = .*=> \{\};/);
  assert.doesNotMatch(source, /handleSendMessage|handleScheduleCall/);
  assert.match(source, /billing-statement-/);
  assert.match(source, /updatePatientMedicalHistory/);
  for (const eventName of [
    'appointment:updated',
    'payment:status_updated',
    'billing:invoice_updated'
  ]) {
    assert.match(collaboration, new RegExp(`'${eventName}'`));
  }
  assert.match(source, /PORTAL_REFRESH_PROFILES\.PATIENTS/);
});

test('clinic patient directory listens to the shared appointment and billing events', () => {
  const source = readSource('src/pages/clinic-portal/patients/index.jsx');
  const collaboration = readSource('src/collaboration/portalCollaboration.mjs');
  for (const eventName of [
    'appointment:updated',
    'payment:status_updated',
    'billing:invoice_updated',
    'clinic:billing_updated'
  ]) {
    assert.match(collaboration, new RegExp(`'${eventName}'`));
  }
  assert.match(source, /PORTAL_REFRESH_PROFILES\.PATIENTS/);
});

test('compliance UI does not describe health forms as informed consent', () => {
  const source = readSource(
    'src/pages/clinic-portal/reports/components/ComplianceView.jsx'
  );

  assert.doesNotMatch(source, /digital consent|consent validity|Persetujuan Digital/i);
  assert.match(source, /health form|formulir kesehatan/i);
});

test('clinic and dentist patient detail show enriched profile fields and health-form empty states', () => {
  const clinicDetail = readSource(
    'src/pages/clinic-portal/patients/components/PatientDetailModal.jsx'
  );
  const dentistDetail = readSource(
    'src/pages/dentist-portal/patient/components/PatientProfile.jsx'
  );

  for (const source of [clinicDetail, dentistDetail]) {
    assert.match(source, /insuranceNumber|Nomor Polis|Nomor polis/);
    assert.match(source, /insuranceMemberId|ID Anggota|ID anggota/);
    assert.match(source, /preferredLanguage|Bahasa Pilihan|Bahasa pilihan/);
    assert.match(source, /emergencyContact/);
    assert.match(source, /latestHealthForm/);
    assert.match(source, /Belum ada formulir kesehatan yang dikirim/);
  }
});
