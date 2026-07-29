import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { emitPortalInvalidation } from '../src/services/portalCollaboration.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const readSource = (relativePath) => fs.readFileSync(path.resolve(here, '..', relativePath), 'utf8');

test('appointment mutations invalidate patient, dentist, and clinic rooms without PHI payloads', () => {
  const source = readSource('src/routes/appointments.js');
  const helperStart = source.indexOf('function emitAppointmentRealtimeUpdate');
  const helperEnd = source.indexOf('\nfunction toBigInt', helperStart);
  const helper = source.slice(helperStart, helperEnd);

  assert.match(helper, /patientId: appointment\.patientId/);
  assert.match(helper, /dentistId: appointment\.dentistId/);
  assert.match(helper, /clinicProfileId,/);
  assert.match(helper, /emitPortalInvalidation\(/);
  assert.doesNotMatch(helper, /patient\.name|dentist\.name|email|phone|reason|notes/);

  assert.equal((source.match(/emitAppointmentRealtimeUpdate\(req, fullAppointment/g) || []).length, 5);
});

test('central invalidation emitter targets scoped rooms and exposes metadata only', () => {
  const rooms = [];
  const emitted = [];
  const audience = {
    to(room) {
      rooms.push(room);
      return this;
    },
    emit(eventName, payload) {
      emitted.push({ eventName, payload });
    },
  };
  const io = {
    to(room) {
      rooms.push(room);
      return audience;
    },
  };

  assert.equal(emitPortalInvalidation({ io, eventName: 'emr:updated', entity: 'emr_record' }), false);
  assert.equal(emitPortalInvalidation({
    io,
    eventName: 'emr:updated',
    entity: 'emr_record',
    entityId: 'emr-1',
    action: 'created',
    patientId: 10n,
    dentistId: 20n,
    clinicProfileIds: [30n, 30n],
  }), true);

  assert.deepEqual(rooms, ['user:10', 'user:20', 'clinic:30']);
  assert.equal(emitted[0].eventName, 'emr:updated');
  assert.deepEqual(Object.keys(emitted[0].payload).sort(), [
    'action', 'entity', 'entityId', 'eventName', 'occurredAt', 'status'
  ]);
  assert.equal(JSON.stringify(emitted[0].payload).includes('patientName'), false);
});

test('simulated payments never broadcast payment metadata globally', () => {
  const source = readSource('src/routes/payments.js');
  assert.doesNotMatch(source, /io\.emit\('notification:new'/);
  assert.match(source, /eventName: 'payment:status_updated'/);
  assert.match(source, /eventName: 'billing:invoice_updated'/);
  assert.match(source, /patientId: appointment\.patientId/);
  assert.match(source, /dentistId: appointment\.dentistId/);
});

test('treatment plan realtime is a PHI-free invalidation across its full lifecycle', () => {
  const service = readSource('src/services/treatmentPlans.js');
  const helper = service.slice(
    service.indexOf('export function emitTreatmentPlanRealtime'),
    service.indexOf('\n}', service.indexOf('export function emitTreatmentPlanRealtime')) + 2
  );
  const dentistRoutes = readSource('src/routes/dentist-portal.js');
  const patientRoutes = readSource('src/routes/patient.js');

  assert.match(helper, /entityId: treatmentPlan\.id/);
  assert.match(helper, /hasInvoice:/);
  assert.doesNotMatch(helper, /treatmentPlan,\s*\n|invoice,\s*\n/);
  for (const eventName of ['created', 'updated', 'sent']) {
    assert.match(dentistRoutes, new RegExp(`eventType: 'treatment_plan:${eventName}'`));
  }
  for (const eventName of ['approved', 'rejected']) {
    assert.match(patientRoutes, new RegExp(`eventType: 'treatment_plan:${eventName}'`));
  }
});

test('clinic staff mutations emit a shared clinic invalidation', () => {
  const source = readSource('src/routes/clinic.js');
  assert.match(source, /eventName: 'clinic:staff_updated'/);
  assert.doesNotMatch(source, /\/debug-user|allStaffInSystem/);
  assert.doesNotMatch(source, /Temporary password for/);
  for (const action of ['created', 'updated', 'role_updated', 'removed']) {
    assert.match(source, new RegExp(`emitClinicStaffRealtimeUpdate\\(req, [^,]+, '${action}',`));
  }
  assert.match(source, /dentistId,/);
});

test('ClinicStaff is the canonical dentist assignment and legacy profile fields stay synchronized', () => {
  const clinicRoutes = readSource('src/routes/clinic.js');
  const dentistPortal = readSource('src/routes/dentist-portal.js');
  const appointments = readSource('src/routes/appointments.js');
  const dentistServices = readSource('src/routes/dentistServices.js');
  const migration = readSource('prisma/migrations/20260722000000_sync_dentist_clinic_assignment/migration.sql');

  assert.match(clinicRoutes, /syncDentistProfileClinicAssignment/);
  assert.match(clinicRoutes, /DENTIST_PROFILE_REQUIRED/);
  assert.match(dentistPortal, /resolveDentistClinicContext/);
  assert.match(appointments, /clinic_branch_not_assigned/);
  assert.match(appointments, /resolveDentistClinicContext/);
  assert.match(dentistServices, /const clinicProfileId = staffRecord\?\.clinic_profile_id \|\| null/);
  assert.match(migration, /CREATE TRIGGER trg_sync_dentist_profile_clinic_assignment/);
  assert.match(migration, /dentist_type = CASE WHEN active_clinic_id IS NULL THEN 'independent' ELSE 'clinic' END/);
});

test('clinic configuration mutations are manager-scoped, whitelisted, and collaborative', () => {
  const source = readSource('src/routes/clinic.js');
  const profileRoute = source.slice(
    source.indexOf("router.put('/profile'"),
    source.indexOf('// Admin routes for clinic management')
  );
  const branchRoutes = source.slice(
    source.indexOf("router.post('/branches'"),
    source.indexOf('// Get clinic inventory stock')
  );

  assert.match(profileRoute, /findClinicManagementProfileForPortalUser/);
  assert.match(profileRoute, /pickDefined\(req\.body/);
  assert.doesNotMatch(profileRoute, /const updateData = \{ \.\.\.req\.body \}/);
  assert.match(branchRoutes, /findClinicManagementProfileForPortalUser/);
  assert.match(branchRoutes, /pickDefined\(req\.body/);
  assert.doesNotMatch(branchRoutes, /const updateData = \{ \.\.\.req\.body \}/);
  assert.match(source, /eventName: 'clinic:profile_updated'|\n\s*'clinic:profile_updated'/);
  assert.match(source, /eventName: 'clinic:branches_updated'|\n\s*'clinic:branches_updated'/);
  assert.match(source, /if \(!clinicStaff\?\.isActive\)/);
});

test('EMR and specialist mutations invalidate both clinical portals', () => {
  const emr = readSource('src/routes/dentist-portal.js');
  const specialist = readSource('src/routes/specialistWorkspace.js');
  const endo = readSource('src/routes/endoCore.js');

  assert.equal((emr.match(/eventName: 'emr:updated'/g) || []).length, 2);
  assert.match(specialist, /eventName: 'specialist:case_updated'/);
  assert.match(specialist, /eventName: 'xcore:case_updated'/);
  assert.match(endo, /emitEndoInvalidation\(req, created, 'created'/);
  assert.match(endo, /radiograph_evidence_linked', \{ xcore: true \}/);
});

test('clinic dentist registration is manager-authorized and fails closed across tenants', () => {
  const source = readSource('src/routes/auth.js');
  const registrationSource = source.slice(source.indexOf("router.post('/register'"));
  const authorization = source.slice(
    source.indexOf('async function authorizeClinicDentistRegistration'),
    source.indexOf('function ensureCorrelationId')
  );

  assert.match(authorization, /clinicProfileId,/);
  assert.match(authorization, /role: \{ in: \['owner', 'manager', 'admin'\] \}/);
  assert.match(authorization, /Only an active clinic owner or manager/);
  assert.match(source, /await authorizeClinicDentistRegistration\(req, clinicId, branchId\)/);
  assert.match(registrationSource, /const client = await getClient\(\)/);
  assert.match(registrationSource, /await client\.query\('BEGIN'\)/);
  assert.match(registrationSource, /INSERT INTO clinic_staff/);
  assert.ok(
    registrationSource.indexOf('INSERT INTO clinic_staff') < registrationSource.indexOf("await client.query('COMMIT')"),
    'clinic assignment must commit atomically with the dentist profile'
  );
  assert.match(registrationSource, /await client\.query\('ROLLBACK'\)/);
  assert.match(registrationSource, /client\.release\(\)/);
  assert.doesNotMatch(registrationSource, /prisma\.user\.delete/);
  assert.doesNotMatch(source, /Full request body|req\.files full object|Profile data:/);
});
