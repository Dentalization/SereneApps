import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

test('chat image flow uses case upload and server-side analysis instead of direct browser AI analysis', () => {
  const hook = read('web/src/pages/dentist-portal/ai/components/useDentalAPI.js');
  const sendMessageStart = hook.indexOf('const sendMessage');
  const imageBranchStart = hook.indexOf('if (imageFile) {', sendMessageStart);
  const imageBranch = hook.slice(imageBranchStart, hook.indexOf('} else {', imageBranchStart));

  assert.match(imageBranch, /caseClient\.createSessionCase/);
  assert.match(imageBranch, /caseClient\.uploadImages/);
  assert.match(imageBranch, /caseClient\.runQualityCheck/);
  assert.match(imageBranch, /caseClient\.recordImageAnalysis/);
  assert.doesNotMatch(imageBranch, /client\.analyzeImage/);
  assert.doesNotMatch(imageBranch, /raw_ai_result/);
});

test('workspace analysis does not depend on pending browser File objects after refresh', () => {
  const hook = read('web/src/pages/dentist-portal/ai/components/useDentalAPI.js');
  const analyzeFn = hook.slice(hook.indexOf('const analyzeWorkspaceImages'), hook.indexOf('const confirmWorkspaceFinding'));

  assert.match(analyzeFn, /caseClient\.recordImageAnalysis/);
  assert.doesNotMatch(analyzeFn, /pendingWorkspaceFilesRef\.current\.get/);
  assert.doesNotMatch(analyzeFn, /client\.analyzeImage/);
  assert.doesNotMatch(analyzeFn, /AI analysis record created from stored case image metadata/);
});

test('patient linkage uses confirmation modal instead of window.prompt', () => {
  const page = read('web/src/pages/dentist-portal/ai/index.jsx');
  const modal = read('web/src/pages/dentist-portal/ai/components/PatientLinkModal.jsx');
  const patientSearch = read('web/src/pages/dentist-portal/components/PatientSearchPicker.jsx');

  assert.doesNotMatch(page, /window\.prompt/);
  assert.match(page, /PatientLinkModal/);
  assert.match(modal, /Konfirmasi tautan/);
  assert.match(modal, /PatientSearchPicker/);
  assert.match(patientSearch, /Cari nama, kode, telepon, atau email/);
});

test('Verified Case Workspace exposes mobile tabs for teledentistry devices', () => {
  const workspace = read('web/src/pages/dentist-portal/ai/components/VerifiedCaseWorkspace.jsx');

  ['Case', 'Findings', 'Audit', 'Export', 'Timeline'].forEach((label) => {
    assert.match(workspace, new RegExp(label));
  });
  assert.match(workspace, /xl:hidden/);
  assert.match(workspace, /activeMobileTab/);
});

test('case export UI does not expose draft exports as a normal verified export path', () => {
  const source = read('web/src/pages/dentist-portal/ai/components/CaseExportPanel.jsx');

  assert.match(source, /caseRecord\?\.status === 'verified'/);
  assert.doesNotMatch(source, /draft:\s*true/);
  assert.match(source, /DRAFT - NOT CLINICIAN VERIFIED/);
});
