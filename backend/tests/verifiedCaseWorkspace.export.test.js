import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVerifiedCasePdf } from '../src/services/verifiedCasePdfExport.js';
import { createVerifiedCaseWorkspaceService } from '../src/services/verifiedCaseWorkspaceService.js';
import { createMemoryVerifiedCaseWorkspaceRepository } from '../src/repositories/verifiedCaseWorkspaceRepository.js';
import { createMemoryImageStorageAdapter } from '../src/services/verifiedCaseImageStorage.js';

function hexText(value) {
  return Buffer.from(value, 'utf8').toString('hex').toUpperCase();
}

test('draft PDF exports carry an unmistakable draft warning in visible PDF text', async () => {
  const buffer = await buildVerifiedCasePdf({
    caseRecord: {
      id: '11111111-1111-4111-8111-111111111111',
      status: 'draft',
      title: 'Draft case',
      patient_id: '4001',
      patient_code: 'MRN-4001',
      created_by: '1001',
    },
    storage: { getObjectBuffer: async () => Buffer.from('') },
    draft: true,
    exportedAt: '2026-05-08T03:00:00.000Z',
  });

  const pdfText = buffer.toString('latin1');
  assert.match(pdfText.toUpperCase(), new RegExp(hexText('DRAFT - NO')));
  assert.match(pdfText.toUpperCase(), new RegExp(hexText('T CLINICIAN ')));
  assert.match(pdfText.toUpperCase(), new RegExp(hexText('VERIFIED')));
  assert.match(pdfText, /DeepDental Draft Case Report/);
});

test('draft exports stay out of the verified export status lifecycle', async () => {
  const actor = { id: '1001', role: 'dentist', tenantId: 'tenant-a', clinicId: 'clinic-a' };
  const service = createVerifiedCaseWorkspaceService({
    repository: createMemoryVerifiedCaseWorkspaceRepository(),
    storage: createMemoryImageStorageAdapter(),
    aiAdapter: { analyzeImage: async () => ({ normalized_findings: { findings: [] }, raw_ai_result: {} }) },
    now: () => new Date('2026-05-08T03:00:00.000Z'),
  });
  const created = await service.createCase({ title: 'Draft export case', patientId: '4001', actor });

  const exported = await service.exportCase({ caseId: created.id, format: 'json', actor, draft: true });
  const loaded = await service.getCase(created.id, { actor });

  assert.equal(exported.metadata.draft, true);
  assert.equal(exported.payload.warning, 'DRAFT - NOT CLINICIAN VERIFIED');
  assert.equal(loaded.status, 'draft');
});
