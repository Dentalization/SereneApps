import PDFDocument from 'pdfkit';

function textValue(value, fallback = 'Not provided') {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function writeSection(doc, title) {
  doc.moveDown(0.8);
  doc.fontSize(14).font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
}

async function addImageIfPossible(doc, storage, storageRef, label) {
  if (!storageRef) return;
  try {
    const buffer = await storage.getObjectBuffer(storageRef);
    doc.font('Helvetica-Bold').text(label);
    doc.image(buffer, { fit: [240, 180], align: 'left' });
    doc.moveDown(0.5);
  } catch {
    doc.text(`${label}: image unavailable from storage`);
  }
}

export async function buildVerifiedCasePdf({
  caseRecord,
  images = [],
  qualityChecks = [],
  aiFindings = [],
  clinicianFindings = [],
  auditEvents = [],
  exports = [],
  storage,
  redacted = false,
  draft = false,
  exportedAt = new Date().toISOString(),
} = {}) {
  const reportTitle = draft ? 'DeepDental Draft Case Report' : 'DeepDental Verified Case Report';
  const doc = new PDFDocument({ margin: 48, size: 'LETTER', compress: false, info: { Title: reportTitle } });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const patientIdentifier = redacted
    ? 'REDACTED'
    : textValue(caseRecord.patient_code || caseRecord.patient_id, 'Unlinked patient');

  if (draft) {
    doc.rect(48, 38, 516, 34).fill('#7f1d1d');
    doc.fillColor('white').fontSize(14).font('Helvetica-Bold').text('DRAFT - NOT CLINICIAN VERIFIED', 56, 48);
    doc.fillColor('black').moveDown(2);
  }

  doc.fontSize(18).font('Helvetica-Bold').text(reportTitle);
  doc.moveDown(0.4);
  doc.fontSize(9).font('Helvetica').text('AI-assisted findings are preliminary. Final interpretation requires clinician judgment and in-person examination when clinically indicated.');
  if (draft) {
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').text('DRAFT - NOT CLINICIAN VERIFIED. This export is not valid as a finalized clinical report.');
    doc.font('Helvetica');
  }

  writeSection(doc, 'Case Metadata');
  doc.text(`Case ID: ${caseRecord.id}`);
  doc.text(`Patient identifier: ${patientIdentifier}`);
  doc.text(`Session ID: ${textValue(caseRecord.session_id, 'No linked session')}`);
  doc.text(`Status: ${caseRecord.status}`);
  doc.text(`Clinician: ${textValue(caseRecord.verified_by || caseRecord.created_by)}`);
  doc.text(`Export timestamp: ${exportedAt}`);

  writeSection(doc, 'Images');
  for (const image of images) {
    doc.font('Helvetica-Bold').text(`${image.file_name} (${image.mime_type})`);
    doc.font('Helvetica').text(`Image ID: ${image.id}`);
    doc.text(`Quality status: ${textValue(image.quality_status, 'Not checked')}`);
    await addImageIfPossible(doc, storage, image.storage_ref, 'Original image');
    await addImageIfPossible(doc, storage, image.annotated_image_ref, 'Annotated image');
  }

  writeSection(doc, 'Image Quality Results');
  qualityChecks.forEach((check) => {
    doc.text(`${check.image_id}: ${check.quality_status} (${check.quality_score}/100)`);
    doc.text(`Recommendation: ${textValue(check.recommendation)}`);
    (check.issues || []).forEach((issue) => doc.text(`- ${issue.code || issue.message}: ${issue.message || ''}`));
  });

  writeSection(doc, 'AI-Assisted Preliminary Findings');
  if (aiFindings.length === 0) doc.text('No AI-assisted findings recorded.');
  aiFindings.forEach((finding) => {
    doc.text(`AI suggestion: ${finding.label} | ${textValue(finding.tooth_or_region)} | ${finding.severity} | confidence ${textValue(finding.confidence)}`);
    if (finding.notes) doc.text(`Notes: ${finding.notes}`);
  });

  writeSection(doc, 'Clinician Findings');
  if (clinicianFindings.length === 0) doc.text('No clinician-confirmed findings recorded.');
  clinicianFindings.forEach((finding) => {
    doc.text(`${finding.status}: ${finding.label} | ${textValue(finding.tooth_or_region)} | ${finding.severity}`);
    if (finding.notes) doc.text(`Clinician notes: ${finding.notes}`);
    if (finding.urgent_referral) doc.text('Urgent referral: yes');
    if (finding.needs_in_person_exam) doc.text('Needs in-person examination: yes');
  });

  writeSection(doc, 'Recommendations And Limitations');
  doc.text('Recommendations must be reviewed by the treating clinician in the context of patient history, exam findings, and applicable standards of care.');
  doc.text('Limitations: image quality, field of view, and AI model uncertainty may affect results. This report is not a standalone diagnosis.');

  writeSection(doc, 'Audit Summary');
  auditEvents.slice(-20).forEach((event) => {
    doc.text(`${event.created_at}: ${event.actor_role}/${event.actor_id} - ${event.event_type}${event.reason ? ` (${event.reason})` : ''}`);
  });

  if (exports.length) {
    writeSection(doc, 'Previous Exports');
    exports.forEach((entry) => doc.text(`${entry.format} exported at ${entry.exported_at}`));
  }

  doc.end();
  return done;
}
