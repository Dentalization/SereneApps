import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const readSource = (relativePath) =>
  fs.readFileSync(path.resolve(here, '..', relativePath), 'utf8');

test('clinic patient directory is scoped to the requesting clinic', () => {
  const source = readSource('src/routes/clinic.js');
  const patientsRoute = source.slice(
    source.indexOf("router.get('/patients'"),
    source.indexOf('// Transform appointments to patient-centric data')
  );

  assert.match(patientsRoute, /ownerClinicId:\s*clinicId/);
  assert.match(patientsRoute, /where:\s*\{\s*userId,\s*isActive:\s*true\s*\}/);
});

test('dentist patient detail scopes clinical and financial records to the dentist', () => {
  const routeSource = readSource('src/routes/dentist-portal.js');
  const emrSource = readSource('src/services/emrRecords.js');

  assert.match(routeSource, /treatmentPlan\.findMany\(\{\s*where:\s*\{\s*patientId,\s*dentistId/s);
  assert.match(routeSource, /invoice\.findMany\(\{\s*where:\s*\{\s*patientId,\s*OR:/s);
  assert.doesNotMatch(routeSource, /listEmrRecordsForPatient\(patientId\)/);
  assert.match(emrSource, /WHERE r\.patient_user_id = \$1 AND r\.dentist_id = \$2/);
});

test('dentist patient GET routes do not mutate appointment status', () => {
  const source = readSource('src/routes/dentist-portal.js');
  const appointmentSource = readSource('src/routes/appointments.js');

  assert.doesNotMatch(source, /AUTO-MARK OVERDUE/);
  assert.doesNotMatch(source, /trigger:\s*'dentist_portal_(patients_list|view)'/);
  assert.doesNotMatch(appointmentSource, /AUTO-MARK OVERDUE/);
  assert.doesNotMatch(appointmentSource, /trigger:\s*'auto_overdue_check'/);
});

test('clinic staff mutations exclude generic staff and cannot assign owner', () => {
  const source = readSource('src/routes/clinic.js');
  const staffMutations = source.slice(
    source.indexOf('// Add staff to clinic'),
    source.indexOf('// =====================\n// CLINIC PATIENTS ENDPOINT')
  );

  for (const routePattern of [
    /router\.post\('\/staff',[^\n]+/,
    /router\.put\('\/staff\/:staffId',[^\n]+/,
    /router\.put\('\/staff\/:userId\/role',[^\n]+/,
    /router\.delete\('\/staff\/:userId',[^\n]+/
  ]) {
    const routeDeclaration = staffMutations.match(routePattern)?.[0] || '';
    assert.ok(routeDeclaration, `Missing staff mutation route: ${routePattern}`);
    assert.doesNotMatch(routeDeclaration, /clinic_staff/);
  }
  assert.doesNotMatch(staffMutations, /const validRoles = \[[^\]]*'owner'[^\]]*\]/);
  assert.match(staffMutations, /assertCanManageClinicStaff/);
  assert.match(source, /role === 'admin' \? 'clinic_admin' : role/);
  assert.doesNotMatch(staffMutations, /roles:\s*\[role\]/);
});

test('clinic payment updates target tenant and participant rooms only', () => {
  const source = readSource('src/routes/clinicBilling.js');
  const helper = source.slice(
    source.indexOf('async function emitClinicPaymentUpdate'),
    source.indexOf("router.get('/permissions'")
  );

  assert.doesNotMatch(helper, /\bio\.emit\(/);
  assert.match(helper, /clinic:\$\{clinicProfileId/);
  assert.match(helper, /user:\$\{userId/);
});

test('admin clinic verification accepts the roles exposed by the admin portal', () => {
  const source = readSource('src/routes/clinic.js');
  const route = source.slice(
    source.indexOf('// Admin: Verify clinic'),
    source.indexOf('// Branch management routes')
  );

  for (const role of ['admin', 'super_admin', 'business_manager', 'customer_success_manager']) {
    assert.match(route, new RegExp(`'${role}'`));
  }
});

test('clinic and dentist patient contracts expose enriched profile and health-form data', () => {
  const clinicSource = readSource('src/routes/clinic.js');
  const dentistSource = readSource('src/routes/dentist-portal.js');

  for (const field of [
    'insuranceProvider',
    'insuranceNumber',
    'insuranceMemberId',
    'emergencyContact',
    'address',
    'preferredLanguage',
    'medicalDetails',
    'latestHealthForm'
  ]) {
    assert.match(clinicSource, new RegExp(`${field}:`));
    assert.match(dentistSource, new RegExp(`serializedPatient\\.${field}`));
  }
});
