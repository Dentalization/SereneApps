import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const webRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = path.resolve(webRoot, '..');
const read = (relativePath) => fs.readFileSync(path.resolve(repoRoot, relativePath), 'utf8');

test('DeepDental chat rendering does not inject untrusted HTML', () => {
  const source = read('web/src/pages/dentist-portal/ai/components/ChatMessage.jsx');

  assert.equal(source.includes('dangerouslySetInnerHTML'), false);
  assert.match(source, /ReactMarkdown/);
  assert.match(source, /rehypeSanitize/);
});

test('DeepDental annotated images are rendered through mime-aware helpers', () => {
  const source = read('web/src/pages/dentist-portal/ai/components/VisualFindingsCard.jsx');

  assert.equal(source.includes('data:image/jpeg;base64,'), false);
  assert.match(source, /buildAnnotatedImageDataUrl/);
});

test('DeepDental frontend source does not reference browser-exposed AI API key env vars', () => {
  const files = [
    'web/src/pages/dentist-portal/ai/components/useDentalAPI.js',
    'web/src/utils/httpClient.js',
  ];

  for (const file of files) {
    const source = read(file);
    assert.equal(source.includes('VITE_DEEPDENTAL_API_KEY'), false, file);
    assert.equal(source.includes('VITE_SERENE_AI_API_KEY'), false, file);
    assert.equal(source.includes("'X-API-Key'"), false, file);
    assert.equal(source.includes('"X-API-Key"'), false, file);
  }
});

test('DeepDental image artifacts are not cached in localStorage', () => {
  const source = read('web/src/pages/dentist-portal/ai/components/useDentalAPI.js');

  assert.equal(source.includes('SESSION_IMAGE_CACHE_KEY'), false);
  assert.equal(source.includes('userImageBase64'), false);
  assert.match(source, /clinicalArtifactStore/);
});

test('DeepDental UI does not expose internal RAG terminology', () => {
  const source = read('web/src/pages/dentist-portal/ai/components/useDentalAPI.js');

  assert.equal(source.includes('Analisis RAG'), false);
  assert.match(source, /Rujukan Jurnal/);
});

test('Visual findings support low concern and non-numeric confidence labels', () => {
  const source = read('web/src/pages/dentist-portal/ai/components/VisualFindingsCard.jsx');

  assert.match(source, /low:/);
  assert.match(source, /formatConfidence/);
  assert.doesNotMatch(source, /finding\\.confidence\\s*&&/);
});

test('DeepDental clinical UI uses permanent safety copy and Indonesian presentation labels', () => {
  const page = read('web/src/pages/dentist-portal/ai/index.jsx');
  const input = read('web/src/pages/dentist-portal/ai/components/InputBar.jsx');
  const findings = read('web/src/pages/dentist-portal/ai/components/VisualFindingsCard.jsx');
  const history = read('web/src/pages/dentist-portal/ai/components/ClinicalHistorySidebar.jsx');
  const clinician = read('web/src/pages/dentist-portal/ai/components/ClinicianFindingPanel.jsx');
  const audit = read('web/src/pages/dentist-portal/ai/components/AuditTrailPanel.jsx');
  const patient = read('web/src/pages/dentist-portal/ai/components/PatientLinkModal.jsx');

  assert.match(page, /ScanLine/);
  assert.match(page, /Stethoscope/);
  assert.match(page, /BookOpen/);
  assert.match(page, /Reset Sesi/);
  assert.doesNotMatch(page, /Knowledge RAG|YOLO AI/);
  assert.doesNotMatch(input, /opacity-0 group-hover:opacity-100 transition-opacity duration-500 select-none/);

  for (const label of [
    'Temuan Klinis',
    'Penanda Patologi',
    'Temuan Terperinci',
    'Tinjauan Dokter Gigi',
    'Gambar dental teranotasi ukuran penuh',
  ]) {
    assert.match(findings, new RegExp(label));
  }

  assert.match(history, /Riwayat Klinis/);
  assert.match(history, /Obrolan/);
  assert.match(clinician, /Dikonfirmasi dokter/);
  assert.match(clinician, /Tambah temuan/);
  assert.match(audit, /ID Permintaan:/);
  assert.match(patient, /Tautkan pasien/);
  assert.match(patient, /Konfirmasi tautan/);
});
