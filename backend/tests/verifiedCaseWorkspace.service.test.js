import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CASE_STATUSES,
  createVerifiedCaseWorkspaceStore,
} from '../src/services/verifiedCaseWorkspaceService.js';

const dentist = { id: 'dentist-1', role: 'dentist' };
const admin = { id: 'admin-1', role: 'admin' };
const patient = { id: 'patient-1', role: 'patient' };

function imageFile(name, body = 'image-bytes', extras = {}) {
  return {
    originalname: name,
    mimetype: extras.mimetype || 'image/jpeg',
    size: extras.size || Buffer.byteLength(body),
    buffer: Buffer.from(body),
  };
}

test('verified case workspace creates a case, uploads images, detects duplicates, and records audit events', () => {
  const store = createVerifiedCaseWorkspaceStore({ now: () => new Date('2026-05-07T10:00:00.000Z') });

  const created = store.createCase({
    title: 'Bitewing follow-up',
    sessionId: 'session-123',
    actor: dentist,
  });

  assert.equal(created.status, CASE_STATUSES.DRAFT);
  assert.equal(created.session_id, 'session-123');

  const firstImage = store.addCaseImage({
    caseId: created.id,
    file: imageFile('bitewing.jpg', 'same-binary'),
    actor: dentist,
  });
  const duplicateImage = store.addCaseImage({
    caseId: created.id,
    file: imageFile('bitewing-copy.jpg', 'same-binary'),
    actor: dentist,
  });

  const loaded = store.getCase(created.id);
  assert.equal(loaded.status, CASE_STATUSES.IMAGES_UPLOADED);
  assert.equal(loaded.image_count, 2);
  assert.equal(firstImage.duplicate_of, null);
  assert.equal(duplicateImage.duplicate_of, firstImage.id);

  const auditTypes = store.listAuditEvents(created.id).map((event) => event.event_type);
  assert.deepEqual(auditTypes, ['case_created', 'image_uploaded', 'image_uploaded']);
});

test('quality checks gate analysis and surface retake recommendations per image', () => {
  const store = createVerifiedCaseWorkspaceStore();
  const created = store.createCase({ title: 'Anterior lesion', actor: dentist });
  const image = store.addCaseImage({
    caseId: created.id,
    file: imageFile('anterior.png', 'front-view', { mimetype: 'image/png' }),
    actor: dentist,
  });

  const rejected = store.runQualityCheck({
    caseId: created.id,
    imageId: image.id,
    actor: dentist,
    metrics: {
      width: 320,
      height: 300,
      blur: 0.9,
      brightness: 0.08,
      contrast: 0.2,
      dentalRelevance: 0.2,
      teethVisible: false,
      faceVisible: true,
    },
  });

  assert.equal(rejected.quality_status, 'needs_retake');
  assert.equal(rejected.can_continue_analysis, false);
  assert.match(rejected.recommendation, /retake/i);
  assert.ok(rejected.issues.some((issue) => issue.code === 'face_visibility_risk'));

  const acceptable = store.runQualityCheck({
    caseId: created.id,
    imageId: image.id,
    actor: dentist,
    metrics: {
      width: 1400,
      height: 1000,
      blur: 0.08,
      brightness: 0.55,
      contrast: 0.68,
      dentalRelevance: 0.95,
      teethVisible: true,
      faceVisible: false,
    },
  });

  assert.equal(acceptable.quality_status, 'acceptable');
  assert.equal(acceptable.can_continue_analysis, true);
  assert.equal(store.getCase(created.id).status, CASE_STATUSES.QUALITY_CHECKED);
});

test('AI findings remain preliminary until a dentist confirms, rejects, edits, or adds clinician findings', () => {
  const store = createVerifiedCaseWorkspaceStore();
  const created = store.createCase({ title: 'Posterior caries review', actor: dentist });
  const image = store.addCaseImage({ caseId: created.id, file: imageFile('posterior.webp', 'posterior', { mimetype: 'image/webp' }), actor: dentist });

  const analysis = store.recordImageAnalysis({
    caseId: created.id,
    imageId: image.id,
    actor: dentist,
    rawAiResult: { model: 'deepdental-local', concern_level: 'moderate' },
    normalizedFindings: {
      findings: [
        { label: 'caries', tooth_or_region: '36', severity: 'moderate', confidence: 0.82, notes: 'Occlusal radiolucency' },
      ],
    },
    annotatedImage: { storage_ref: '/uploads/cases/annotated.webp', mime_type: 'image/webp' },
  });

  assert.equal(analysis.findings[0].status, 'ai_suggested');
  assert.equal(store.getCase(created.id).status, CASE_STATUSES.PENDING_CLINICIAN_REVIEW);
  assert.throws(
    () => store.confirmFinding({ caseId: created.id, findingId: analysis.findings[0].id, actor: patient }),
    /permission_denied/
  );

  const confirmed = store.confirmFinding({
    caseId: created.id,
    findingId: analysis.findings[0].id,
    actor: dentist,
    patch: { notes: 'Confirmed clinically; schedule restoration.', urgent_referral: false },
  });
  const rejected = store.rejectFinding({
    caseId: created.id,
    findingId: analysis.findings[0].id,
    actor: dentist,
    reason: 'Duplicate marker from same lesion',
  });
  const manual = store.createClinicianFinding({
    caseId: created.id,
    actor: dentist,
    finding: {
      label: 'gingival inflammation',
      tooth_or_region: 'lower anterior',
      severity: 'mild',
      notes: 'Manual clinician finding after review',
    },
  });

  assert.equal(confirmed.status, 'clinician_confirmed');
  assert.equal(rejected.status, 'clinician_rejected');
  assert.equal(manual.status, 'manual_added');
  assert.equal(manual.source, 'clinician');

  const labels = store.listFindings(created.id).map((finding) => `${finding.status}:${finding.label}`);
  assert.ok(labels.includes('clinician_confirmed:caries'));
  assert.ok(labels.includes('clinician_rejected:caries'));
  assert.ok(labels.includes('manual_added:gingival inflammation'));
});

test('verification, exports, archive, and patient timeline linkage create immutable audit records', () => {
  const store = createVerifiedCaseWorkspaceStore({ now: () => new Date('2026-05-07T11:00:00.000Z') });
  const created = store.createCase({ title: 'Verified workspace case', sessionId: 'session-999', actor: dentist });
  const linked = store.linkPatient({ caseId: created.id, patientId: 'patient-88', actor: dentist });
  const image = store.addCaseImage({ caseId: linked.id, file: imageFile('occlusal.jpg', 'occlusal'), actor: dentist });
  store.runQualityCheck({
    caseId: linked.id,
    imageId: image.id,
    actor: dentist,
    metrics: { width: 1200, height: 900, blur: 0.1, brightness: 0.5, contrast: 0.7, dentalRelevance: 0.9, teethVisible: true, faceVisible: false },
  });
  const analysis = store.recordImageAnalysis({
    caseId: linked.id,
    imageId: image.id,
    actor: dentist,
    normalizedFindings: { findings: [{ label: 'plaque', severity: 'mild', confidence: 0.61 }] },
  });
  store.confirmFinding({ caseId: linked.id, findingId: analysis.findings[0].id, actor: dentist });

  const verified = store.verifyCase({ caseId: linked.id, actor: dentist });
  assert.equal(verified.status, CASE_STATUSES.VERIFIED);
  assert.throws(
    () => store.removeCaseImage({ caseId: linked.id, imageId: image.id, actor: dentist }),
    /image_remove_locked/
  );
  const archivedImage = store.removeCaseImage({
    caseId: linked.id,
    imageId: image.id,
    actor: admin,
    reason: 'Administrative archive request after duplicate external upload',
  });
  assert.equal(archivedImage.archived, true);

  const jsonExport = store.exportCase({ caseId: linked.id, format: 'json', actor: dentist, redacted: true });
  const pdfExport = store.exportCase({ caseId: linked.id, format: 'pdf', actor: dentist });
  const archivedCase = store.archiveCase({ caseId: linked.id, actor: dentist, reason: 'Case closed after report export' });

  assert.equal(jsonExport.format, 'json');
  assert.equal(jsonExport.payload.case.id, linked.id);
  assert.equal(pdfExport.mime_type, 'application/pdf');
  assert.match(pdfExport.payload, /^%PDF-1\.4/);
  assert.equal(archivedCase.status, CASE_STATUSES.ARCHIVED);

  const timelineTypes = store.getPatientTimeline('patient-88').map((event) => event.event_type);
  assert.ok(timelineTypes.includes('case_created'));
  assert.ok(timelineTypes.includes('images_uploaded'));
  assert.ok(timelineTypes.includes('analysis_completed'));
  assert.ok(timelineTypes.includes('clinician_verified'));
  assert.ok(timelineTypes.includes('report_exported'));

  const auditTypes = store.listAuditEvents(linked.id).map((event) => event.event_type);
  assert.ok(auditTypes.includes('case_exported'));
  assert.ok(auditTypes.includes('case_archived'));
  assert.throws(() => store.deleteAuditEvent(linked.id, auditTypes[0]), /audit_events_are_immutable/);
});
