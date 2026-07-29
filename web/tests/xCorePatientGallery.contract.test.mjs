import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('X-Core upload keeps patient optional and Gallery exposes later assignment', () => {
  const uploader = read('src/pages/dentist-portal/x-core/components/Uploader.jsx');
  const gallery = read('src/pages/dentist-portal/x-core/components/Gallery.jsx');
  const assignment = read('src/pages/dentist-portal/x-core/components/AssignStudyPatientModal.jsx');

  assert.match(uploader, /if \(files\.length === 0\) return/);
  assert.match(uploader, /if \(selectedPatient\?\.id\)/);
  assert.match(uploader, />\s*Optional\s*</);
  assert.match(uploader, /disabled=\{files\.length === 0\}/);
  assert.match(gallery, /Not linked to patient/);
  assert.match(gallery, /setPatientAssignTarget\(study\)/);
  assert.match(assignment, /hasCurrentPatient \? 'Change Patient' : 'Assign Patient'/);
});

test('Patient Medical History renders linked X-Core studies with direct viewer navigation', () => {
  const patientPage = read('src/pages/dentist-portal/patient/index.jsx');
  const history = read('src/pages/dentist-portal/patient/components/PatientMedicalHistory.jsx');

  assert.match(patientPage, /xCoreStudies: Array\.isArray\(fullPatient\.xCoreStudies\)/);
  assert.match(history, /const xCoreStudies = Array\.isArray\(patient\?\.xCoreStudies\)/);
  assert.match(history, /renderXCoreSection/);
  assert.match(history, /\/dentist-portal\/x-core\?studyId=/);
  assert.match(history, /xcore-imaging/);
});
