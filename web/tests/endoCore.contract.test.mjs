import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readSource = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Endo-Core routes, sidebar entry, and exact page tree are registered', () => {
  const routes = readSource('src/Routes.jsx');
  const sidebar = readSource('src/pages/dentist-portal/ui/SideBar.jsx');
  const index = readSource('src/pages/dentist-portal/endo-core/index.jsx');
  const requiredComponents = [
    'EndoCaseDirectory',
    'CreateEndoCaseModal',
    'EndoCaseDetail',
    'EndoDiagnosticTests',
    'EndoTreatmentTimeline',
    'EndoOdontogramPicker',
    'EndoXCoreEvidence',
  ];

  assert.match(routes, /pages\/dentist-portal\/endo-core/);
  assert.match(routes, /path="\/dentist-portal\/endo-core"/);
  assert.match(routes, /path="\/dentist-portal\/endo-core\/:caseId"/);
  assert.match(sidebar, /label:\s*'Endo-Core'/);
  assert.match(sidebar, /path:\s*'\/dentist-portal\/endo-core'/);
  assert.match(index, /useParams/);
  for (const component of requiredComponents) {
    readSource(`src/pages/dentist-portal/endo-core/components/${component}.jsx`);
  }
});

test('Endo create flow requires patient, FDI tooth, title, and chief complaint', () => {
  const modal = readSource('src/pages/dentist-portal/endo-core/components/CreateEndoCaseModal.jsx');
  const service = readSource('src/services/endoCoreService.js');

  assert.match(modal, /!patient\?\.id\s*\|\|\s*!form\.toothNumber/);
  assert.match(modal, /!form\.chiefComplaint\.trim\(\)\s*\|\|\s*!form\.title\.trim\(\)/);
  assert.match(modal, /endo_tooth_duplicate_case|response\?\.status === 409/);
  assert.match(modal, /dentist-portal\/endo-core\/\$\{apiError\.existingCaseId\}/);
  assert.match(service, /authHttp\.post\('\/specialist-workspace\/endo\/cases'/);
  assert.doesNotMatch(service, /\bfetch\s*\(/);
});

test('Endo tooth picker imports the shared permanent FDI rows and never mutates EMR', () => {
  const picker = readSource('src/pages/dentist-portal/endo-core/components/EndoOdontogramPicker.jsx');
  const modal = readSource('src/pages/dentist-portal/endo-core/components/CreateEndoCaseModal.jsx');

  assert.match(picker, /import\s+\{\s*PERMANENT_TEETH_ROWS\s*\}\s+from\s+'..\/..\/patient-emr\/odontogramConfig'/);
  assert.match(picker, /PERMANENT_TEETH_ROWS\.map/);
  assert.match(picker, /Endo-Core tidak mengubah odontogram EMR/);
  assert.match(modal, /getPatientEmrRecords/);
  assert.doesNotMatch(`${picker}\n${modal}`, /toothNotationSystem|Universal notation/i);
});

test('Endo UI exposes documentation controls without autonomous diagnosis language', () => {
  const detail = readSource('src/pages/dentist-portal/endo-core/components/EndoCaseDetail.jsx');
  const diagnostics = readSource('src/pages/dentist-portal/endo-core/components/EndoDiagnosticTests.jsx');
  const stages = readSource('src/pages/dentist-portal/endo-core/components/EndoTreatmentTimeline.jsx');
  const evidence = readSource('src/pages/dentist-portal/endo-core/components/EndoXCoreEvidence.jsx');

  assert.match(detail, /Endo-Core structures endodontic documentation\. It does not diagnose, prescribe, or replace dentist judgment\./);
  assert.match(detail, /Working notes are never copied automatically/);
  assert.match(diagnostics, /cold.*percussion.*palpation.*mobility.*probing/s);
  assert.match(stages, /assessment.*working_length.*cleaning_shaping.*follow_up/s);
  assert.match(evidence, /without copying images, findings, or annotations/);
  assert.doesNotMatch(`${diagnostics}\n${stages}`, /AI diagnosis|automatic diagnosis|antibiotic recommendation/i);
});

test('patient and appointment surfaces provide scoped Endo entry points', () => {
  const patientPanel = readSource('src/pages/dentist-portal/patient/components/SpecialistCasesPanel.jsx');
  const drawer = readSource('src/pages/dentist-portal/schedule/components/AppointmentDetailDrawer.jsx');
  const schedule = readSource('src/pages/dentist-portal/schedule/index.jsx');

  assert.match(patientPanel, /Create Endo Case/);
  assert.match(patientPanel, /dentist-portal\/endo-core\?/);
  assert.match(drawer, /Open Endo Case/);
  assert.match(schedule, /patientId: String\(appointment\.patient\.id\)/);
  assert.match(schedule, /appointmentId: String\(appointment\.id\)/);
});

test('clinic patient detail renders only the safe specialist summary contract', () => {
  const clinicPatientDetail = readSource(
    'src/pages/clinic-portal/patients/components/PatientDetailModal.jsx',
  );

  assert.match(clinicPatientDetail, /caseRecord\.safeLabel/);
  assert.match(clinicPatientDetail, /caseRecord\.status/);
  assert.match(clinicPatientDetail, /caseRecord\.updatedAt/);
  assert.match(clinicPatientDetail, /caseRecord\.hasXcoreEvidence/);
  assert.doesNotMatch(
    clinicPatientDetail,
    /caseRecord\.(toothNumber|pulpDiagnosis|periapicalDiagnosis|diagnosticTests|treatmentStages|completionSummary|difficultyFactors)/,
  );
});
