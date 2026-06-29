import test from 'node:test';
import assert from 'node:assert/strict';
import { createVerifiedCaseWorkspaceService } from '../src/services/verifiedCaseWorkspaceService.js';
import { createMemoryVerifiedCaseWorkspaceRepository } from '../src/repositories/verifiedCaseWorkspaceRepository.js';
import { createMemoryImageStorageAdapter } from '../src/services/verifiedCaseImageStorage.js';

const clinicA = { id: '1001', role: 'dentist', clinicId: 'clinic-a', tenantId: 'tenant-a' };
const clinicB = { id: '2001', role: 'dentist', clinicId: 'clinic-b', tenantId: 'tenant-b' };
const adminA = { id: '3001', role: 'admin', clinicId: 'clinic-a', tenantId: 'tenant-a' };
const patientA = { id: '4001', role: 'patient', clinicId: 'clinic-a', tenantId: 'tenant-a' };

function makeService({ state, storageState, aiResult } = {}) {
  const repository = createMemoryVerifiedCaseWorkspaceRepository({ state });
  const storage = createMemoryImageStorageAdapter({ state: storageState });
  const aiAdapter = {
    analyzeImage: async () => aiResult || ({
      raw_ai_result: { model: 'test-ai' },
      normalized_findings: {
        findings: [{ label: 'caries', tooth_or_region: '36', severity: 'moderate', confidence: 0.82 }],
      },
      annotated_image_base64: Buffer.from('annotated').toString('base64'),
      annotated_image_mime_type: 'image/png',
    }),
  };
  return createVerifiedCaseWorkspaceService({ repository, storage, aiAdapter, now: () => new Date('2026-05-08T01:00:00.000Z') });
}

function imageFile(name = 'scan.jpg', body = 'image-bytes') {
  return {
    originalname: name,
    mimetype: 'image/jpeg',
    size: Buffer.byteLength(body),
    buffer: Buffer.from(body),
  };
}

test('repository-backed cases and uploaded images persist across service instances', async () => {
  const state = {};
  const storageState = {};
  const serviceA = makeService({ state, storageState });
  const created = await serviceA.createCase({ title: 'Durable workspace', actor: clinicA });
  const image = await serviceA.addCaseImage({ caseId: created.id, file: imageFile(), actor: clinicA });

  assert.match(created.id, /^[0-9a-f-]{36}$/i);
  assert.match(image.id, /^[0-9a-f-]{36}$/i);
  assert.ok(image.signed_url, 'uploaded image exposes a retrievable signed URL');

  const serviceB = makeService({ state, storageState });
  const loaded = await serviceB.getCase(created.id, { actor: clinicA });
  const images = await serviceB.listImages(created.id, { actor: clinicA });

  assert.equal(loaded.title, 'Durable workspace');
  assert.equal(images[0].id, image.id);
  assert.equal(await serviceB.storage.getObjectBuffer(images[0].storage_ref).then((buffer) => buffer.toString()), 'image-bytes');
});

test('server-side analysis requires latest quality check to allow analysis', async () => {
  const service = makeService();
  const created = await service.createCase({ title: 'Quality gated case', actor: clinicA });
  const image = await service.addCaseImage({ caseId: created.id, file: imageFile(), actor: clinicA });

  await assert.rejects(
    () => service.recordImageAnalysis({ caseId: created.id, imageId: image.id, actor: clinicA }),
    /quality_check_required/
  );

  await service.runQualityCheck({
    caseId: created.id,
    imageId: image.id,
    actor: clinicA,
    metrics: { width: 200, height: 200, blur: 0.95, brightness: 0.08, contrast: 0.1, dentalRelevance: 0.2, teethVisible: false },
  });

  await assert.rejects(
    () => service.recordImageAnalysis({ caseId: created.id, imageId: image.id, actor: clinicA }),
    /image_quality_blocks_analysis/
  );

  await service.runQualityCheck({
    caseId: created.id,
    imageId: image.id,
    actor: clinicA,
    metrics: { width: 1200, height: 900, blur: 0.05, brightness: 0.52, contrast: 0.72, dentalRelevance: 0.94, teethVisible: true },
  });

  const analysis = await service.recordImageAnalysis({ caseId: created.id, imageId: image.id, actor: clinicA });
  assert.equal(analysis.findings[0].status, 'ai_suggested');
  assert.equal(analysis.image.annotated_image_mime_type, 'image/png');
  assert.ok(analysis.image.annotated_image_signed_url);
});

test('AI findings normalize string confidence and do not duplicate annotated base64 in database records', async () => {
  const service = makeService({
    aiResult: {
      raw_ai_result: {
        image_quality: 'adequate',
        concern_level: 'moderate',
        recommendations: ['Perform a clinical examination.'],
        limitations: 'Clinical correlation is required.',
        annotated_image_base64: Buffer.from('large-annotated-image').toString('base64'),
      },
      normalized_findings: {
        findings: [{
          label: 'possible caries',
          tooth_or_region: '36',
          severity: 'moderate',
          confidence: 'high',
          notes: 'Confirm clinically.',
        }],
      },
      annotated_image_base64: Buffer.from('large-annotated-image').toString('base64'),
      annotated_image_mime_type: 'image/jpeg',
    },
  });
  const created = await service.createCase({ title: 'Contract normalization', actor: clinicA });
  const image = await service.addCaseImage({ caseId: created.id, file: imageFile(), actor: clinicA });
  await service.runQualityCheck({
    caseId: created.id,
    imageId: image.id,
    actor: clinicA,
    metrics: { width: 1200, height: 900, blur: 0.05, brightness: 0.52, contrast: 0.72, dentalRelevance: 0.94, teethVisible: true },
  });

  const analysis = await service.recordImageAnalysis({
    caseId: created.id,
    imageId: image.id,
    actor: clinicA,
  });

  assert.equal(analysis.findings.length, 1);
  assert.equal(analysis.findings[0].confidence, null);
  assert.equal(analysis.findings[0].raw_ai_result.annotated_image_base64, undefined);
  assert.equal(analysis.visual_findings.limitations, 'Clinical correlation is required.');
  assert.equal(analysis.visual_findings.annotated_image_base64, undefined);
});

test('workspace converts detection-only AI output into reviewable findings', async () => {
  const service = makeService({
    aiResult: {
      raw_ai_result: {
        image_quality: 'adequate',
        findings: [],
        detections: [{ mark_id: '1', label: 'caries', confidence: 0.81, bbox: [10, 20, 30, 40] }],
        concern_level: 'moderate',
        recommendations: [],
        limitations: 'Clinical confirmation is required.',
        annotated_image_base64: null,
      },
      normalized_findings: {
        findings: [{
          label: 'caries',
          description: 'Low-confidence visual detector signal requiring clinical confirmation.',
          differentials: ['Extrinsic staining', 'Early enamel demineralization'],
          confidence: 0.81,
          mark_id: '1',
          bbox: [10, 20, 30, 40],
        }],
        detections: [{ mark_id: '1', label: 'caries', confidence: 0.81, bbox: [10, 20, 30, 40] }],
        concern_level: 'moderate',
      },
      annotated_image_base64: null,
      annotated_image_mime_type: 'image/jpeg',
    },
  });
  const created = await service.createCase({ title: 'Detection fallback', actor: clinicA });
  const image = await service.addCaseImage({ caseId: created.id, file: imageFile(), actor: clinicA });
  await service.runQualityCheck({
    caseId: created.id,
    imageId: image.id,
    actor: clinicA,
    metrics: { width: 1200, height: 900, blur: 0.05, brightness: 0.52, contrast: 0.72, dentalRelevance: 0.94, teethVisible: true },
  });

  const analysis = await service.recordImageAnalysis({
    caseId: created.id,
    imageId: image.id,
    actor: clinicA,
  });

  assert.equal(analysis.findings.length, 1);
  assert.equal(analysis.findings[0].label, 'caries');
  assert.equal(analysis.findings[0].confidence, 0.81);
  assert.equal(analysis.visual_findings.findings[0].description, 'Low-confidence visual detector signal requiring clinical confirmation.');
  assert.deepEqual(analysis.visual_findings.findings[0].differentials, ['Extrinsic staining', 'Early enamel demineralization']);
});

test('multi-image analysis can continue after a case reaches pending clinician review', async () => {
  const service = makeService();
  const created = await service.createCase({ title: 'Multi-image analysis', actor: clinicA });
  const firstImage = await service.addCaseImage({ caseId: created.id, file: imageFile('first.jpg', 'first-image'), actor: clinicA });
  const secondImage = await service.addCaseImage({ caseId: created.id, file: imageFile('second.jpg', 'second-image'), actor: clinicA });
  const acceptable = { width: 1200, height: 900, blur: 0.05, brightness: 0.52, contrast: 0.72, dentalRelevance: 0.94, teethVisible: true };

  await service.runQualityCheck({ caseId: created.id, imageId: firstImage.id, actor: clinicA, metrics: acceptable });
  await service.runQualityCheck({ caseId: created.id, imageId: secondImage.id, actor: clinicA, metrics: acceptable });

  const firstAnalysis = await service.recordImageAnalysis({ caseId: created.id, imageId: firstImage.id, actor: clinicA });
  assert.equal(firstAnalysis.case.status, 'pending_clinician_review');

  const secondAnalysis = await service.recordImageAnalysis({ caseId: created.id, imageId: secondImage.id, actor: clinicA });
  assert.equal(secondAnalysis.case.status, 'pending_clinician_review');
  assert.equal(secondAnalysis.findings[0].image_id, secondImage.id);
});

test('status transitions, verification, and exports are explicit and clinically gated', async () => {
  const service = makeService();
  const created = await service.createCase({ title: 'Export gated case', actor: clinicA });
  const linked = await service.linkPatient({ caseId: created.id, patientId: '4001', patientCode: 'MRN-4001', actor: clinicA });
  const image = await service.addCaseImage({ caseId: linked.id, file: imageFile(), actor: clinicA });

  await assert.rejects(
    () => service.patchCase({ caseId: linked.id, patch: { status: 'verified' }, actor: clinicA }),
    /status_mutation_not_allowed/
  );
  await assert.rejects(
    () => service.exportCase({ caseId: linked.id, format: 'json', actor: clinicA }),
    /case_verification_required/
  );

  await service.runQualityCheck({
    caseId: linked.id,
    imageId: image.id,
    actor: clinicA,
    metrics: { width: 1200, height: 900, blur: 0.05, brightness: 0.52, contrast: 0.72, dentalRelevance: 0.94, teethVisible: true },
  });
  const analysis = await service.recordImageAnalysis({ caseId: linked.id, imageId: image.id, actor: clinicA });
  await service.confirmFinding({ caseId: linked.id, findingId: analysis.findings[0].id, actor: clinicA });

  const verified = await service.verifyCase({ caseId: linked.id, actor: clinicA });
  assert.equal(verified.status, 'verified');
  const exported = await service.exportCase({ caseId: linked.id, format: 'json', actor: clinicA });
  assert.equal(exported.format, 'json');
  assert.equal((await service.getCase(linked.id, { actor: clinicA })).status, 'exported');
});

test('tenant scoping hides other clinic cases and patient timeline is string-safe', async () => {
  const service = makeService();
  const owned = await service.createCase({ title: 'Clinic A case', patientId: '4001', actor: clinicA });
  await service.createCase({ title: 'Clinic B case', actor: clinicB });

  const casesForA = await service.listCases({ actor: clinicA });
  assert.deepEqual(casesForA.map((entry) => entry.title), ['Clinic A case']);

  await assert.rejects(() => service.getCase(owned.id, { actor: clinicB }), /case_not_found/);
  await assert.rejects(() => service.getPatientTimeline('4002', { actor: patientA }), /permission_denied/);

  const timeline = await service.getPatientTimeline(4001, { actor: { ...patientA, id: 4001 } });
  assert.ok(Array.isArray(timeline));
});

test('audit events are immutable through the repository contract', async () => {
  const service = makeService();
  const created = await service.createCase({ title: 'Audit immutable', actor: clinicA });
  const auditEvents = await service.listAuditEvents(created.id, { actor: clinicA });

  await assert.rejects(
    () => service.repository.updateAuditEvent(auditEvents[0].event_id, { reason: 'tamper' }),
    /audit_events_are_immutable/
  );
  await assert.rejects(
    () => service.repository.deleteAuditEvent(auditEvents[0].event_id),
    /audit_events_are_immutable/
  );
});

test('admin archive can remove verified images only with reason and archives storage object', async () => {
  const service = makeService();
  const created = await service.createCase({ title: 'Archive image', patientId: '4001', actor: clinicA });
  const image = await service.addCaseImage({ caseId: created.id, file: imageFile(), actor: clinicA });
  await service.runQualityCheck({
    caseId: created.id,
    imageId: image.id,
    actor: clinicA,
    metrics: { width: 1200, height: 900, blur: 0.05, brightness: 0.52, contrast: 0.72, dentalRelevance: 0.94, teethVisible: true },
  });
  const analysis = await service.recordImageAnalysis({ caseId: created.id, imageId: image.id, actor: clinicA });
  await service.confirmFinding({ caseId: created.id, findingId: analysis.findings[0].id, actor: clinicA });
  await service.verifyCase({ caseId: created.id, actor: clinicA });

  await assert.rejects(
    () => service.removeCaseImage({ caseId: created.id, imageId: image.id, actor: clinicA }),
    /image_remove_locked/
  );

  const archived = await service.removeCaseImage({
    caseId: created.id,
    imageId: image.id,
    actor: adminA,
    reason: 'Wrong file attached before export',
  });
  assert.equal(archived.archived, true);
  assert.equal(await service.storage.isArchived(image.storage_ref), true);
});
