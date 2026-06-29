import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../..');

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('Verified Case Workspace frontend uses clinical case UI instead of simple session-only history', () => {
  const page = readRepoFile('web/src/pages/dentist-portal/ai/index.jsx');
  const sidebar = readRepoFile('web/src/pages/dentist-portal/ai/components/ClinicalHistorySidebar.jsx');
  const workspace = readRepoFile('web/src/pages/dentist-portal/ai/components/VerifiedCaseWorkspace.jsx');

  assert.match(page, /ClinicalHistorySidebar/);
  assert.match(page, /VerifiedCaseWorkspace/);
  assert.match(sidebar, /pending_review/);
  assert.match(sidebar, /low_quality/);
  assert.match(sidebar, /timelineLinked/);
  assert.match(workspace, /MultiImageUploader/);
  assert.match(workspace, /ClinicianFindingPanel/);
  assert.match(workspace, /AuditTrailPanel/);
  assert.match(workspace, /CaseExportPanel/);
  assert.match(workspace, /PatientTimelinePanel/);
});

test('Verified Case Workspace client exposes the required clinical endpoints without browser API keys', () => {
  const client = readRepoFile('web/src/pages/dentist-portal/ai/components/verifiedCaseWorkspaceClient.mjs');

  [
    '/cases',
    '/archive',
    '/images',
    '/quality-check',
    '/analyze',
    '/findings',
    '/confirm',
    '/reject',
    '/audit',
    '/export/pdf',
    '/export/json',
    '/link-patient',
    '/timeline',
    '/sessions/',
  ].forEach((endpoint) => assert.match(client, new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));

  assert.doesNotMatch(client, /VITE_DEEPDENTAL_API_KEY|VITE_SERENE_AI_API_KEY|X-API-Key/i);
  assert.match(client, /resolveWorkspaceArtifactUrl/);
  assert.ok(client.includes("http?.defaults?.baseURL"));
});

test('backend route registers case, image, finding, audit, export, timeline, and session-case contracts', () => {
  const route = readRepoFile('backend/src/routes/verified-cases.js');
  const server = readRepoFile('backend/src/server.js');

  [
    "router.post('/cases'",
    "router.get('/cases/:caseId'",
    "router.post('/cases/:caseId/images'",
    "router.post('/cases/:caseId/images/:imageId/quality-check'",
    "router.post('/cases/:caseId/images/:imageId/analyze'",
    "router.post('/cases/:caseId/findings'",
    "router.post('/cases/:caseId/findings/:findingId/confirm'",
    "router.post('/cases/:caseId/findings/:findingId/reject'",
    "router.get('/cases/:caseId/audit'",
    "router.post('/cases/:caseId/export/pdf'",
    "router.post('/cases/:caseId/export/json'",
    "router.post('/cases/:caseId/link-patient'",
    "router.get('/patients/:patientId/timeline'",
    "router.get('/sessions/:sessionId/case'",
    "router.post('/sessions/:sessionId/case'",
  ].forEach((snippet) => assert.ok(route.includes(snippet), snippet));

  assert.match(server, /verifiedCasesRouter/);
});

test('patient linking is scoped to the authenticated dentist patient relationship', () => {
  const route = readRepoFile('backend/src/routes/verified-cases.js');
  const modal = readRepoFile('web/src/pages/dentist-portal/ai/components/PatientLinkModal.jsx');

  assert.match(route, /verifyDentistPatientAccess/);
  assert.match(route, /patient_access_denied/);
  assert.match(route, /FROM appointments/);
  assert.match(route, /dentist_id = \$1/);
  assert.match(route, /patient_id = \$2/);
  assert.match(modal, /sortBy: 'lastVisit'/);
  assert.match(modal, /limit: 20/);
  assert.match(modal, /Daftar ini hanya menampilkan pasien/);
});
