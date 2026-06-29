import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('dentist patient AI chat uses only the Serene dentist-scoped endpoint', () => {
  const page = read('src/pages/dentist-portal/patient/components/PatientAIResult.jsx');
  const hook = read('src/pages/dentist-portal/patient/components/useDentistAIChat.js');

  assert.doesNotMatch(page, /localStorage/);
  assert.equal(page.includes("post('/chat"), false);
  assert.equal(page.includes("post('/sessions"), false);
  assert.equal(page.includes("formData.append('role'"), false);
  assert.match(hook, /dentist-portal\/patients/);
  assert.match(hook, /Idempotency-Key/);
  assert.match(hook, /response\.data\?\.context/);
  assert.match(hook, /setContext\(null\)/);
  assert.doesNotMatch(hook, /role\\s*:/);
  assert.match(page, /chatContext\?\.images/);
  assert.match(page, /msg\.role === 'patient'/);
  assert.match(hook, /new FormData\(\)/);
  assert.match(hook, /append\('images'/);
  assert.match(page, /Tambahkan radiografi atau foto dental/);
  assert.match(page, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(page, /AIThinkingBubble/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /aria-busy=\{chatLoading\}/);
  assert.match(page, /Meninjau konteks klinis/);
});

test('mobile clinical chat preserves provenance and safe-area composer', () => {
  const panel = read('src/pages/dentist-portal/patient/components/DentistChatPanel.jsx');

  assert.match(panel, /Dokter Gigi/);
  assert.match(panel, /Serene AI/);
  assert.match(panel, /Pasien/);
  assert.match(panel, /actorName/);
  assert.match(panel, /createdAt/);
  assert.match(panel, /safe-area-inset-bottom/);
  assert.match(panel, /min-h-11/);
});

test('linked verified cases retain creator provenance and remain read-only in patient results', () => {
  const page = read('src/pages/dentist-portal/patient/components/PatientAIResult.jsx');
  const patientPage = read('src/pages/dentist-portal/patient/index.jsx');
  const route = read('../backend/src/routes/dentist-portal.js');

  assert.match(route, /listLinkedVerifiedCaseResults/);
  assert.match(route, /created_by_name/);
  assert.match(route, /source: 'verified_case'/);
  assert.match(patientPage, /createdBy: r\.createdBy/);
  assert.match(page, /Dibuat oleh drg\./);
  assert.match(page, /Catatan lintas dokter/);
});

test('backend derives dentist chat role and context server-side', () => {
  const route = read('../backend/src/routes/dentist-portal.js');
  const service = read('../backend/src/services/dentistAIChatService.js');

  assert.match(route, /ai-results\/:resultId\/chat/);
  assert.match(route, /const role = 'dentist'/);
  assert.match(service, /CLINICAL_SYSTEM_PROMPT/);
  assert.match(service, /idempotency_key/);
  assert.match(service, /prisma\.\$transaction/);
  assert.match(service, /where: \{ dentistId, patientId \}/);
  assert.match(service, /fetchUpstreamSession/);
  assert.match(service, /imageInputsFromMedia/);
  assert.match(service, /images: imageInputs\.length/);
  assert.doesNotMatch(service, /console\.log.*content|console\.log.*context|console\.log.*prompt/);
});
