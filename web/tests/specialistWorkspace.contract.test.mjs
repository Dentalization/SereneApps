import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const readSource = (relativePath) =>
  fs.readFileSync(path.resolve(here, '..', relativePath), 'utf8');
const readTreeSource = (relativePath) => {
  const absolutePath = path.resolve(here, '..', relativePath);
  return fs.readdirSync(absolutePath, { withFileTypes: true })
    .map((entry) => {
      const childRelative = path.join(relativePath, entry.name);
      if (entry.isDirectory()) return readTreeSource(childRelative);
      return /\.(jsx?|mjs)$/.test(entry.name) ? readSource(childRelative) : '';
    })
    .join('\n');
};

test('dentist Specialist Workspace renders PHI context, notes, timeline, and safe X-Core state', () => {
  const page = readSource('src/pages/dentist-portal/specialist-workspace/index.jsx');

  assert.match(page, /patient\?\.name/);
  assert.match(page, /medicalDetails|medicalContext/);
  assert.match(page, /healthForm/);
  assert.match(page, /caseRecord\.notes/);
  assert.match(page, /addSpecialistCaseNote/);
  assert.match(page, /timelineEvents/);
  assert.match(page, /X-Core evidence is not available|X-Core evidence belum tersedia/);
  assert.match(page, /must be verified by a dentist/);
  assert.doesNotMatch(page, /AI diagnosis/i);
});

test('workspace actions follow valid lifecycle and patient plus appointment entries are wired', () => {
  const page = readSource('src/pages/dentist-portal/specialist-workspace/index.jsx');
  const patientPage = readSource('src/pages/dentist-portal/patient/index.jsx');
  const patientCases = readSource(
    'src/pages/dentist-portal/patient/components/SpecialistCasesPanel.jsx'
  );
  const schedulePage = readSource('src/pages/dentist-portal/schedule/index.jsx');
  const appointmentDrawer = readSource(
    'src/pages/dentist-portal/schedule/components/AppointmentDetailDrawer.jsx'
  );
  const routes = readSource('src/Routes.jsx');

  assert.match(page, /draft:\s*'active'/);
  assert.match(page, /active:\s*'completed'/);
  assert.match(page, /completed:\s*'archived'/);
  assert.match(page, /updateSpecialistCaseStatus/);
  assert.match(patientPage, /SpecialistCasesPanel/);
  assert.match(patientCases, /CreateSpecialistCaseModal/);
  assert.match(patientCases, /patientId=\{patient\.id\}/);
  assert.match(appointmentDrawer, /Open Specialist Case/);
  assert.match(schedulePage, /CreateSpecialistCaseModal/);
  assert.match(schedulePage, /appointmentId=\{[^}]*appointment[^}]*\?*\.id/i);
  assert.match(routes, /dentist-portal\/specialist-workspace\/:caseId/);
});

test('dentist sidebar opens a real Specialist Workspace case directory', () => {
  const sidebar = readSource('src/pages/dentist-portal/ui/SideBar.jsx');
  const directory = readSource(
    'src/pages/dentist-portal/specialist-workspace/CaseDirectory.jsx'
  );
  const routes = readSource('src/Routes.jsx');

  assert.match(sidebar, /label:\s*'Specialist Workspace'/);
  assert.match(sidebar, /path:\s*'\/dentist-portal\/specialist-workspace'/);
  assert.match(routes, /path="\/dentist-portal\/specialist-workspace"/);
  assert.match(directory, /listSpecialistCases/);
  assert.match(directory, /specialist-workspace\/\$\{caseRecord\.id\}/);
  assert.match(directory, /caseRecord\.patient\?\.name/);
  assert.match(directory, /CreateSpecialistCaseModal/);
  assert.doesNotMatch(directory, /navigate\('\/dentist-portal\/patient'\)/);
  assert.match(directory, /Belum ada Specialist Case/);
  assert.match(directory, /Coba lagi/);
});

test('create-case modal reuses dentist patient search and submits the fixed radiology contract', () => {
  const modal = readSource(
    'src/pages/dentist-portal/specialist-workspace/CreateSpecialistCaseModal.jsx'
  );
  const patientSearch = readSource(
    'src/pages/dentist-portal/components/PatientSearchPicker.jsx'
  );
  const service = readSource('src/services/specialistWorkspaceService.js');
  const xcore = readSource('src/pages/dentist-portal/x-core/index.jsx');
  const xcoreGallery = readSource(
    'src/pages/dentist-portal/x-core/components/Gallery.jsx'
  );

  assert.match(modal, /patientId/);
  assert.match(modal, /appointmentId/);
  assert.match(modal, /xcoreVerifiedCaseId/);
  assert.match(modal, /appointmentSummary/);
  assert.match(modal, /xcoreSummary/);
  assert.match(modal, /listPatientXcoreStudies/);
  assert.match(modal, /selectedXcoreStudy/);
  assert.match(modal, /xcoreStudyId/);
  assert.match(modal, /X-Core Study/);
  assert.match(modal, /study\.modality/);
  assert.match(modal, /study\.description/);
  assert.match(modal, /formatDate/);
  assert.match(modal, /PatientSearchPicker/);
  assert.match(modal, /createSpecialistCase/);
  assert.match(modal, /caseType:\s*'radiology'/);
  assert.match(modal, /specialist-workspace\/\$\{created\.id\}/);
  assert.doesNotMatch(modal, /<form\b|onSubmit=|<select\b/);
  assert.match(patientSearch, /getDentistPatients/);
  assert.match(service, /\/specialist-workspace\/xcore\/studies/);
  assert.match(xcore, /initialStudyId=\{requestedStudyId\}/);
  assert.match(xcoreGallery, /setSelectedStudyDetails\(matchingStudy\)/);
});

test('appointment context is human-readable, unambiguous, exact-filtered, and fail-open', () => {
  const modal = readSource(
    'src/pages/dentist-portal/specialist-workspace/CreateSpecialistCaseModal.jsx'
  );
  const patientCases = readSource(
    'src/pages/dentist-portal/patient/components/SpecialistCasesPanel.jsx'
  );
  const schedulePage = readSource('src/pages/dentist-portal/schedule/index.jsx');

  assert.match(modal, /appointmentSummary\.startsAt/);
  assert.match(modal, /appointmentSummary\.reason/);
  assert.match(patientCases, /candidateAppointments/);
  assert.match(patientCases, /candidateAppointments\.length === 1/);
  assert.match(patientCases, /appointmentSummary=/);
  assert.match(schedulePage, /originAppointmentId:\s*appointment\.id/);
  assert.doesNotMatch(schedulePage, /existingCases\.find/);
  assert.match(schedulePage, /setSpecialistCaseAppointment\(appointment\)/);
  assert.match(schedulePage, /deliberate fail-open|fail-open/i);
  assert.match(schedulePage, /appointmentSummary=/);
});

test('X-Core requires patient assignment on upload and supports owner reassignment', () => {
  const uploader = readSource('src/pages/dentist-portal/x-core/components/Uploader.jsx');
  const gallery = readSource('src/pages/dentist-portal/x-core/components/Gallery.jsx');
  const assignmentModal = readSource(
    'src/pages/dentist-portal/x-core/components/AssignStudyPatientModal.jsx'
  );

  assert.match(uploader, /PatientSearchPicker/);
  assert.match(uploader, /formData\.append\('patientId'/);
  assert.match(uploader, /selectedPatient/);
  assert.match(uploader, /disabled=\{files\.length === 0 \|\| !selectedPatient\?\.id\}/);
  assert.match(gallery, /Assign Patient|Change Patient/);
  assert.match(assignmentModal, /\/patient/);
  assert.match(assignmentModal, /PatientSearchPicker/);
});

test('verified X-Core case can chain patient linking into Specialist Case creation', () => {
  const workspace = readSource(
    'src/pages/dentist-portal/ai/components/VerifiedCaseWorkspace.jsx'
  );
  const aiPage = readSource('src/pages/dentist-portal/ai/index.jsx');

  assert.match(workspace, /Create Specialist Case/);
  assert.match(workspace, /onCreateSpecialistCase/);
  assert.match(workspace, /\['verified', 'exported'\]\.includes\(caseRecord\?\.status\)/);
  assert.match(aiPage, /CreateSpecialistCaseModal/);
  assert.match(aiPage, /setPatientLinkOpen\(true\)/);
  assert.match(aiPage, /await linkWorkspacePatient\(patient\)/);
  assert.match(aiPage, /xcoreVerifiedCaseId=/);
  assert.match(aiPage, /xcoreSummary=/);
});

test('case detail follows note, safety, confirmation, and case-type display rules', () => {
  const page = readSource('src/pages/dentist-portal/specialist-workspace/index.jsx');

  assert.doesNotMatch(page, /<form\b|onSubmit=|event\.preventDefault/);
  assert.match(page, /onClick=\{handleAddNote\}/);
  assert.match(page, /caseRecord\.status === 'draft' \|\| caseRecord\.status === 'active'/);
  assert.match(page, /ConfirmDialog/);
  assert.match(page, /caseRecord\.caseType/);
  assert.match(page, /bg-red-50/);
  assert.match(page, /medicalContext/);
  assert.match(page, /insurance\?\.provider/);
});

test('clinic and admin portals do not render Specialist Case clinical notes', () => {
  for (const relativePath of [
    'src/pages/clinic-portal',
    'src/pages/admin-portal',
  ]) {
    const source = readTreeSource(relativePath);
    assert.doesNotMatch(source, /SpecialistCaseNote|specialistCase\.notes/);
  }
});
