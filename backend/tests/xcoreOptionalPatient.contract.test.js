import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('X-Core schema and upload contract allow a gallery study without a patient', () => {
  const schema = read('prisma/schema.prisma');
  const controller = read('src/controllers/xCoreController.js');
  const migration = read('prisma/migrations/20260724000000_xcore_optional_patient/migration.sql');

  assert.match(schema, /patientId\s+BigInt\?\s+@map\("patient_id"\)/);
  assert.match(schema, /patient\s+User\?\s+@relation\("PatientStudies"/);
  assert.match(migration, /ALTER COLUMN patient_id DROP NOT NULL/);
  assert.doesNotMatch(controller, /Select a patient before uploading an X-Core study/);
  assert.match(controller, /if \(patientId\) \{\s*try \{\s*await requireDentistPatientRelationship/s);
  assert.match(controller, /if \(userId && targetPatientId\)/);
});

test('X-Core patient assignment remains audited and invalidates patient views', () => {
  const controller = read('src/controllers/xCoreController.js');
  const collaboration = read('../web/src/collaboration/portalCollaboration.mjs');

  assert.match(controller, /source: 'manual'/);
  assert.match(controller, /eventName: 'xcore:study_updated'/);
  assert.match(controller, /action: 'patient_assigned'/);
  assert.match(collaboration, /'xcore:study_updated': \[/);
  assert.match(collaboration, /PORTAL_DATA_DOMAINS\.PATIENTS/);
});

test('dentist patient details include only owned or active same-clinic shared X-Core studies', () => {
  const route = read('src/routes/dentist-portal.js');

  assert.match(route, /serializedPatient\.xCoreStudies = xCoreStudies\.map/);
  assert.match(route, /activeDentistClinicIds\(dentistId/);
  assert.match(route, /clinicStudyScopeWhereForClinicIds\(activeXCoreClinicIds\)/);
  assert.match(route, /\{ dentistId \}/);
  assert.match(route, /recipientDentistId: dentistId/);
  assert.match(route, /revokedAt: null/);
  assert.doesNotMatch(route, /serializedPatient\.xCoreStudies\s*=.*metadata/);
});
