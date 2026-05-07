import crypto from 'crypto';

export const CASE_STATUSES = Object.freeze({
  DRAFT: 'draft',
  IMAGES_UPLOADED: 'images_uploaded',
  QUALITY_CHECKED: 'quality_checked',
  ANALYSIS_COMPLETED: 'analysis_completed',
  PENDING_CLINICIAN_REVIEW: 'pending_clinician_review',
  VERIFIED: 'verified',
  EXPORTED: 'exported',
  ARCHIVED: 'archived',
});

export const FINDING_STATUSES = Object.freeze({
  AI_SUGGESTED: 'ai_suggested',
  CLINICIAN_CONFIRMED: 'clinician_confirmed',
  CLINICIAN_REJECTED: 'clinician_rejected',
  CLINICIAN_EDITED: 'clinician_edited',
  MANUAL_ADDED: 'manual_added',
});

export const AUDIT_EVENT_TYPES = Object.freeze([
  'case_created',
  'case_updated',
  'patient_linked',
  'image_uploaded',
  'image_removed',
  'image_quality_checked',
  'image_retake_requested',
  'image_analysis_started',
  'image_analysis_completed',
  'ai_finding_created',
  'finding_confirmed',
  'finding_rejected',
  'finding_edited',
  'manual_finding_added',
  'case_verified',
  'case_exported',
  'case_archived',
  'timeline_linked',
]);

const CLINICIAN_ROLES = new Set(['dentist', 'admin']);
const EXPORT_ROLES = new Set(['dentist', 'admin']);

function isoNow(now) {
  const value = typeof now === 'function' ? now() : new Date();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function normalizeActor(actor = {}) {
  return {
    id: actor.id?.toString?.() || actor.userId?.toString?.() || 'system',
    role: actor.role || actor.roles?.[0] || 'system',
  };
}

function requireRole(actor, allowedRoles, code = 'permission_denied') {
  const normalized = normalizeActor(actor);
  if (!allowedRoles.has(normalized.role)) {
    const error = new Error(code);
    error.code = code;
    throw error;
  }
  return normalized;
}

function createCounterIdFactory() {
  const counters = new Map();
  return (prefix) => {
    const next = (counters.get(prefix) || 0) + 1;
    counters.set(prefix, next);
    return `${prefix}_${String(next).padStart(6, '0')}`;
  };
}

function hashFile(file = {}) {
  if (file.contentHash) return file.contentHash;
  const hash = crypto.createHash('sha256');
  if (file.buffer) hash.update(file.buffer);
  else hash.update(`${file.originalname || file.name || ''}:${file.size || 0}:${file.mimetype || file.type || ''}`);
  return hash.digest('hex');
}

function normalizeFile(file = {}) {
  return {
    file_name: file.originalname || file.name || 'dental-image',
    mime_type: file.mimetype || file.type || 'application/octet-stream',
    size_bytes: Number(file.size || file.buffer?.length || 0),
    content_hash: hashFile(file),
  };
}

function caseSummary(caseRecord, images, findings, exports) {
  const caseImages = images.filter((image) => image.case_id === caseRecord.id && !image.archived);
  const caseFindings = findings.filter((finding) => finding.case_id === caseRecord.id);
  return {
    ...caseRecord,
    image_count: caseImages.length,
    has_low_quality_images: caseImages.some((image) => ['warning', 'rejected', 'needs_retake'].includes(image.quality_status)),
    timeline_linked: Boolean(caseRecord.patient_id),
    finding_labels: [...new Set(caseFindings.map((finding) => finding.label).filter(Boolean))],
    export_count: exports.filter((entry) => entry.case_id === caseRecord.id).length,
  };
}

function buildPdfPayload({ caseRecord, images, qualityChecks, aiFindings, clinicianFindings, auditEvents, redacted }) {
  const patientIdentifier = redacted ? 'REDACTED' : (caseRecord.patient_code || caseRecord.patient_id || 'Unlinked');
  const lines = [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj',
    '4 0 obj << /Length 0 >> stream',
    `DeepDental Verified Case Report`,
    `Case ID: ${caseRecord.id}`,
    `Patient: ${patientIdentifier}`,
    `Session: ${caseRecord.session_id || 'none'}`,
    `Status: ${caseRecord.status}`,
    `Images: ${images.length}`,
    `Quality checks: ${qualityChecks.length}`,
    `AI-assisted findings: ${aiFindings.length}`,
    `Clinician-confirmed findings: ${clinicianFindings.filter((finding) => finding.status === FINDING_STATUSES.CLINICIAN_CONFIRMED).length}`,
    `Audit events: ${auditEvents.length}`,
    'Limitations: AI-assisted findings are preliminary and require clinician judgment.',
    'endstream endobj',
    'xref',
    '0 5',
    '0000000000 65535 f ',
    'trailer << /Root 1 0 R >>',
    '%%EOF',
  ];
  return lines.join('\n');
}

function evaluateQuality(metrics = {}, duplicateOf = null) {
  const issues = [];
  const addIssue = (code, severity, message, penalty) => issues.push({ code, severity, message, penalty });

  const width = Number(metrics.width || 0);
  const height = Number(metrics.height || 0);
  const blur = Number(metrics.blur ?? metrics.blurScore ?? 0);
  const brightness = Number(metrics.brightness ?? 0.5);
  const contrast = Number(metrics.contrast ?? 0.5);
  const dentalRelevance = Number(metrics.dentalRelevance ?? metrics.dental_relevance ?? 0.8);
  const teethVisible = metrics.teethVisible ?? metrics.teeth_visible ?? true;
  const faceVisible = metrics.faceVisible ?? metrics.face_visible ?? false;
  const cropping = Number(metrics.cropping ?? 0);

  if (duplicateOf) addIssue('duplicate_image', 'warning', 'Image appears to duplicate another image in this case.', 20);
  if (width && height && Math.min(width, height) < 480) addIssue('low_resolution', 'rejected', 'Image resolution is too low for reliable clinical review.', 28);
  if (blur > 0.65) addIssue('blur', 'rejected', 'Image is too blurry for reliable analysis.', 30);
  if (brightness < 0.15) addIssue('underexposure', 'rejected', 'Image is underexposed.', 24);
  if (brightness > 0.88) addIssue('overexposure', 'warning', 'Image may be overexposed.', 16);
  if (contrast < 0.3) addIssue('low_contrast', 'warning', 'Image contrast is low.', 14);
  if (cropping > 0.65) addIssue('cropping', 'warning', 'Important anatomy may be cropped.', 14);
  if (dentalRelevance < 0.5) addIssue('not_dental_or_intraoral', 'rejected', 'Image does not clearly show dental or intraoral anatomy.', 35);
  if (!teethVisible) addIssue('teeth_or_gum_not_visible', 'rejected', 'Teeth or gum area is not visible enough.', 35);
  if (faceVisible) addIssue('face_visibility_risk', 'warning', 'Image may reveal patient face or identifiable features.', 18);

  const qualityScore = Math.max(0, Math.min(100, Math.round(100 - issues.reduce((sum, issue) => sum + issue.penalty, 0))));
  const rejected = issues.some((issue) => issue.severity === 'rejected');
  const needsRetake = rejected || qualityScore < 50;
  const qualityStatus = needsRetake ? 'needs_retake' : issues.length ? 'warning' : 'acceptable';

  return {
    quality_score: qualityScore,
    quality_status: qualityStatus,
    issues: issues.map(({ penalty, ...issue }) => issue),
    recommendation: needsRetake
      ? 'Retake image before AI analysis. Capture a focused intraoral view with teeth/gum area visible.'
      : issues.length
        ? 'Continue with caution and document the quality limitations.'
        : 'Image quality is acceptable for AI-assisted analysis.',
    can_continue_analysis: !needsRetake,
  };
}

export function createVerifiedCaseWorkspaceStore({ now = () => new Date(), idFactory = createCounterIdFactory() } = {}) {
  const cases = new Map();
  const images = new Map();
  const qualityChecks = new Map();
  const aiFindings = new Map();
  const clinicianFindings = new Map();
  const auditEvents = new Map();
  const exportsById = new Map();
  const timelineEvents = new Map();

  const allImages = () => [...images.values()];
  const allAiFindings = () => [...aiFindings.values()];
  const allClinicianFindings = () => [...clinicianFindings.values()];
  const allFindings = () => [...allAiFindings(), ...allClinicianFindings()];
  const allExports = () => [...exportsById.values()];
  const allQualityChecks = () => [...qualityChecks.values()];

  function getCaseOrThrow(caseId) {
    const caseRecord = cases.get(caseId);
    if (!caseRecord) throw new Error('case_not_found');
    return caseRecord;
  }

  function recordAudit({ caseId, actor, eventType, before = null, after = null, reason = null, requestId = null, deviceMetadata = null }) {
    if (!AUDIT_EVENT_TYPES.includes(eventType)) throw new Error('unsupported_audit_event_type');
    const normalizedActor = normalizeActor(actor);
    const event = {
      event_id: idFactory('audit'),
      case_id: caseId,
      actor_id: normalizedActor.id,
      actor_role: normalizedActor.role,
      event_type: eventType,
      before_json: deepClone(before),
      after_json: deepClone(after),
      reason,
      created_at: isoNow(now),
      request_id: requestId,
      device_metadata: deviceMetadata,
    };
    auditEvents.set(event.event_id, event);
    return deepClone(event);
  }

  function recordTimeline({ patientId, caseId, eventType, actor, details = {} }) {
    if (!patientId) return null;
    const caseRecord = getCaseOrThrow(caseId);
    const event = {
      event_id: idFactory('timeline'),
      patient_id: patientId,
      case_id: caseId,
      event_type: eventType,
      event_date: isoNow(now),
      case_title: caseRecord.title,
      case_status: caseRecord.status,
      confirmed_findings_summary: allClinicianFindings()
        .filter((finding) => finding.case_id === caseId && finding.status === FINDING_STATUSES.CLINICIAN_CONFIRMED)
        .map((finding) => finding.label)
        .join(', '),
      image_count: allImages().filter((image) => image.case_id === caseId && !image.archived).length,
      report_link: details.report_link || null,
      related_session_id: caseRecord.session_id || null,
      actor_id: normalizeActor(actor).id,
      details: deepClone(details),
    };
    timelineEvents.set(event.event_id, event);
    return deepClone(event);
  }

  function createCase({ title = 'Untitled dental case', patientId = null, sessionId = null, actor } = {}) {
    const normalizedActor = requireRole(actor, CLINICIAN_ROLES);
    const id = idFactory('case');
    const timestamp = isoNow(now);
    const caseRecord = {
      id,
      patient_id: patientId || null,
      patient_name: null,
      patient_code: patientId ? `P-${patientId}` : null,
      session_id: sessionId || null,
      title,
      status: CASE_STATUSES.DRAFT,
      created_by: normalizedActor.id,
      created_at: timestamp,
      updated_at: timestamp,
      verified_by: null,
      verified_at: null,
      exported_at: null,
      archived_at: null,
      last_message_preview: '',
    };
    cases.set(id, caseRecord);
    recordAudit({ caseId: id, actor: normalizedActor, eventType: 'case_created', after: caseRecord });
    if (patientId) recordTimeline({ patientId, caseId: id, eventType: 'case_created', actor: normalizedActor });
    return deepClone(caseSummary(caseRecord, allImages(), allFindings(), allExports()));
  }

  function listCases({ includeArchived = false, search = '' } = {}) {
    const query = search.trim().toLowerCase();
    return [...cases.values()]
      .filter((caseRecord) => includeArchived || caseRecord.status !== CASE_STATUSES.ARCHIVED)
      .map((caseRecord) => caseSummary(caseRecord, allImages(), allFindings(), allExports()))
      .filter((caseRecord) => {
        if (!query) return true;
        const haystack = [
          caseRecord.id,
          caseRecord.title,
          caseRecord.patient_id,
          caseRecord.patient_name,
          caseRecord.patient_code,
          caseRecord.session_id,
          caseRecord.last_message_preview,
          ...(caseRecord.finding_labels || []),
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }

  function getCase(caseId) {
    return deepClone(caseSummary(getCaseOrThrow(caseId), allImages(), allFindings(), allExports()));
  }

  function updateCaseStatus(caseRecord, status, actor, eventType = 'case_updated', extras = {}) {
    const before = deepClone(caseRecord);
    caseRecord.status = status;
    caseRecord.updated_at = isoNow(now);
    Object.assign(caseRecord, extras);
    recordAudit({ caseId: caseRecord.id, actor, eventType, before, after: caseRecord, reason: extras.reason || null });
    return caseRecord;
  }

  function patchCase({ caseId, patch = {}, actor }) {
    const normalizedActor = requireRole(actor, CLINICIAN_ROLES);
    const caseRecord = getCaseOrThrow(caseId);
    const before = deepClone(caseRecord);
    const allowed = ['title', 'status', 'last_message_preview'];
    allowed.forEach((key) => {
      if (patch[key] !== undefined) caseRecord[key] = patch[key];
    });
    caseRecord.updated_at = isoNow(now);
    recordAudit({ caseId, actor: normalizedActor, eventType: 'case_updated', before, after: caseRecord, reason: patch.reason || null });
    return getCase(caseId);
  }

  function linkPatient({ caseId, patientId, patientName = null, patientCode = null, actor }) {
    const normalizedActor = requireRole(actor, CLINICIAN_ROLES);
    const caseRecord = getCaseOrThrow(caseId);
    const before = deepClone(caseRecord);
    caseRecord.patient_id = patientId;
    caseRecord.patient_name = patientName;
    caseRecord.patient_code = patientCode || `P-${patientId}`;
    caseRecord.updated_at = isoNow(now);
    recordAudit({ caseId, actor: normalizedActor, eventType: 'patient_linked', before, after: caseRecord });
    recordAudit({ caseId, actor: normalizedActor, eventType: 'timeline_linked', after: { patient_id: patientId } });
    recordTimeline({ patientId, caseId, eventType: 'case_created', actor: normalizedActor });
    recordTimeline({ patientId, caseId, eventType: 'timeline_linked', actor: normalizedActor });
    return getCase(caseId);
  }

  function addCaseImage({ caseId, file, actor }) {
    const normalizedActor = requireRole(actor, CLINICIAN_ROLES);
    const caseRecord = getCaseOrThrow(caseId);
    if ([CASE_STATUSES.VERIFIED, CASE_STATUSES.EXPORTED, CASE_STATUSES.ARCHIVED].includes(caseRecord.status)) {
      throw new Error('case_locked');
    }
    const fileMeta = normalizeFile(file);
    const duplicate = allImages().find((image) => image.case_id === caseId && !image.archived && image.content_hash === fileMeta.content_hash);
    const id = idFactory('image');
    const imageRecord = {
      id,
      case_id: caseId,
      ...fileMeta,
      storage_ref: `/uploads/verified-cases/${caseId}/${id}-${fileMeta.file_name}`,
      annotated_image_ref: null,
      annotated_image_mime_type: null,
      duplicate_of: duplicate?.id || null,
      upload_status: 'uploaded',
      quality_status: null,
      archived: false,
      created_at: isoNow(now),
      updated_at: isoNow(now),
    };
    images.set(id, imageRecord);
    if (caseRecord.status === CASE_STATUSES.DRAFT) {
      caseRecord.status = CASE_STATUSES.IMAGES_UPLOADED;
    }
    caseRecord.updated_at = isoNow(now);
    recordAudit({ caseId, actor: normalizedActor, eventType: 'image_uploaded', after: imageRecord });
    recordTimeline({ patientId: caseRecord.patient_id, caseId, eventType: 'images_uploaded', actor: normalizedActor, details: { image_id: id } });
    return deepClone(imageRecord);
  }

  function listImages(caseId) {
    getCaseOrThrow(caseId);
    return allImages().filter((image) => image.case_id === caseId).map(deepClone);
  }

  function removeCaseImage({ caseId, imageId, actor, reason = null }) {
    const normalizedActor = normalizeActor(actor);
    const caseRecord = getCaseOrThrow(caseId);
    const imageRecord = images.get(imageId);
    if (!imageRecord || imageRecord.case_id !== caseId) throw new Error('image_not_found');
    const locked = [CASE_STATUSES.VERIFIED, CASE_STATUSES.EXPORTED, CASE_STATUSES.ARCHIVED].includes(caseRecord.status);
    if (locked && (normalizedActor.role !== 'admin' || !reason)) {
      throw new Error('image_remove_locked');
    }
    requireRole(actor, locked ? new Set(['admin']) : CLINICIAN_ROLES);
    const before = deepClone(imageRecord);
    imageRecord.archived = true;
    imageRecord.updated_at = isoNow(now);
    recordAudit({ caseId, actor: normalizedActor, eventType: 'image_removed', before, after: imageRecord, reason });
    return deepClone(imageRecord);
  }

  function runQualityCheck({ caseId, imageId, actor, metrics = {} }) {
    const normalizedActor = requireRole(actor, CLINICIAN_ROLES);
    const caseRecord = getCaseOrThrow(caseId);
    const imageRecord = images.get(imageId);
    if (!imageRecord || imageRecord.case_id !== caseId) throw new Error('image_not_found');
    const evaluated = evaluateQuality(metrics, imageRecord.duplicate_of);
    const check = {
      id: idFactory('quality'),
      image_id: imageId,
      case_id: caseId,
      ...evaluated,
      metrics: deepClone(metrics),
      checked_by: normalizedActor.id,
      created_at: isoNow(now),
    };
    qualityChecks.set(check.id, check);
    imageRecord.quality_status = check.quality_status;
    imageRecord.updated_at = isoNow(now);
    if (![CASE_STATUSES.ANALYSIS_COMPLETED, CASE_STATUSES.PENDING_CLINICIAN_REVIEW, CASE_STATUSES.VERIFIED, CASE_STATUSES.EXPORTED, CASE_STATUSES.ARCHIVED].includes(caseRecord.status)) {
      caseRecord.status = CASE_STATUSES.QUALITY_CHECKED;
      caseRecord.updated_at = isoNow(now);
    }
    recordAudit({ caseId, actor: normalizedActor, eventType: 'image_quality_checked', after: check });
    if (!check.can_continue_analysis) {
      recordAudit({ caseId, actor: normalizedActor, eventType: 'image_retake_requested', after: check, reason: check.recommendation });
    }
    return deepClone(check);
  }

  function recordImageAnalysis({ caseId, imageId, actor, rawAiResult = {}, normalizedFindings = {}, annotatedImage = null }) {
    const normalizedActor = requireRole(actor, CLINICIAN_ROLES);
    const caseRecord = getCaseOrThrow(caseId);
    const imageRecord = images.get(imageId);
    if (!imageRecord || imageRecord.case_id !== caseId) throw new Error('image_not_found');
    recordAudit({ caseId, actor: normalizedActor, eventType: 'image_analysis_started', after: { image_id: imageId } });

    if (annotatedImage) {
      imageRecord.annotated_image_ref = annotatedImage.storage_ref || annotatedImage.url || null;
      imageRecord.annotated_image_mime_type = annotatedImage.mime_type || annotatedImage.mimeType || null;
      imageRecord.updated_at = isoNow(now);
    }

    const sourceFindings = Array.isArray(normalizedFindings.findings)
      ? normalizedFindings.findings
      : Array.isArray(normalizedFindings.detections)
        ? normalizedFindings.detections.map((detection) => ({
            label: detection.label,
            severity: detection.severity || normalizedFindings.concern_level || 'mild',
            confidence: detection.confidence,
            tooth_or_region: detection.location || detection.tooth_or_region || null,
            notes: detection.description || '',
          }))
        : [];

    const createdFindings = sourceFindings.map((finding) => {
      const record = {
        id: idFactory('finding'),
        finding_id: null,
        case_id: caseId,
        image_id: imageId,
        label: finding.label || finding.description || 'AI finding',
        tooth_or_region: finding.tooth_or_region || finding.location || null,
        severity: finding.severity || 'mild',
        confidence: finding.confidence ?? null,
        source: 'ai',
        status: FINDING_STATUSES.AI_SUGGESTED,
        notes: finding.notes || finding.description || '',
        raw_ai_result: deepClone(rawAiResult),
        confirmed_by: null,
        confirmed_at: null,
        updated_at: isoNow(now),
        created_at: isoNow(now),
      };
      record.finding_id = record.id;
      aiFindings.set(record.id, record);
      recordAudit({ caseId, actor: normalizedActor, eventType: 'ai_finding_created', after: record });
      return record;
    });

    updateCaseStatus(caseRecord, CASE_STATUSES.ANALYSIS_COMPLETED, normalizedActor, 'image_analysis_completed', { last_message_preview: createdFindings.map((finding) => finding.label).join(', ') });
    caseRecord.status = CASE_STATUSES.PENDING_CLINICIAN_REVIEW;
    caseRecord.updated_at = isoNow(now);
    recordTimeline({ patientId: caseRecord.patient_id, caseId, eventType: 'analysis_completed', actor: normalizedActor });
    return {
      image: deepClone(imageRecord),
      findings: deepClone(createdFindings),
      case: getCase(caseId),
    };
  }

  function findFinding(caseId, findingId) {
    const finding = aiFindings.get(findingId) || clinicianFindings.get(findingId);
    if (!finding || finding.case_id !== caseId) throw new Error('finding_not_found');
    return finding;
  }

  function createClinicianFindingRecord({ caseId, imageId = null, actor, sourceFinding = {}, patch = {}, status, eventType, reason = null }) {
    const normalizedActor = requireRole(actor, CLINICIAN_ROLES);
    const timestamp = isoNow(now);
    const record = {
      id: idFactory('clinician_finding'),
      finding_id: null,
      case_id: caseId,
      image_id: imageId || sourceFinding.image_id || null,
      label: patch.label || sourceFinding.label || 'clinician finding',
      tooth_or_region: patch.tooth_or_region ?? sourceFinding.tooth_or_region ?? null,
      severity: patch.severity || sourceFinding.severity || 'mild',
      confidence: patch.confidence ?? sourceFinding.confidence ?? null,
      source: patch.source || sourceFinding.source || 'clinician',
      status,
      notes: patch.notes ?? sourceFinding.notes ?? '',
      urgent_referral: Boolean(patch.urgent_referral),
      needs_in_person_exam: Boolean(patch.needs_in_person_exam),
      confirmed_by: normalizedActor.id,
      confirmed_at: timestamp,
      updated_at: timestamp,
      created_at: timestamp,
      reason,
    };
    record.finding_id = record.id;
    clinicianFindings.set(record.id, record);
    recordAudit({ caseId, actor: normalizedActor, eventType, after: record, reason });
    return deepClone(record);
  }

  function confirmFinding({ caseId, findingId, actor, patch = {} }) {
    const sourceFinding = findFinding(caseId, findingId);
    return createClinicianFindingRecord({
      caseId,
      actor,
      sourceFinding,
      patch: { ...patch, source: sourceFinding.source || 'ai' },
      status: FINDING_STATUSES.CLINICIAN_CONFIRMED,
      eventType: 'finding_confirmed',
    });
  }

  function rejectFinding({ caseId, findingId, actor, reason = null }) {
    const sourceFinding = findFinding(caseId, findingId);
    return createClinicianFindingRecord({
      caseId,
      actor,
      sourceFinding,
      patch: { source: sourceFinding.source || 'ai' },
      status: FINDING_STATUSES.CLINICIAN_REJECTED,
      eventType: 'finding_rejected',
      reason,
    });
  }

  function updateFinding({ caseId, findingId, actor, patch = {} }) {
    const sourceFinding = findFinding(caseId, findingId);
    return createClinicianFindingRecord({
      caseId,
      actor,
      sourceFinding,
      patch,
      status: FINDING_STATUSES.CLINICIAN_EDITED,
      eventType: 'finding_edited',
    });
  }

  function createClinicianFinding({ caseId, actor, finding }) {
    getCaseOrThrow(caseId);
    return createClinicianFindingRecord({
      caseId,
      actor,
      patch: { ...finding, source: 'clinician' },
      status: FINDING_STATUSES.MANUAL_ADDED,
      eventType: 'manual_finding_added',
    });
  }

  function listFindings(caseId) {
    getCaseOrThrow(caseId);
    return allFindings()
      .filter((finding) => finding.case_id === caseId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(deepClone);
  }

  function verifyCase({ caseId, actor }) {
    const normalizedActor = requireRole(actor, CLINICIAN_ROLES);
    const caseRecord = getCaseOrThrow(caseId);
    if (!caseRecord.patient_id) throw new Error('patient_link_required');
    const hasClinicianFinding = allClinicianFindings().some((finding) => finding.case_id === caseId && [FINDING_STATUSES.CLINICIAN_CONFIRMED, FINDING_STATUSES.CLINICIAN_EDITED, FINDING_STATUSES.MANUAL_ADDED].includes(finding.status));
    if (!hasClinicianFinding) throw new Error('clinician_finding_required');
    const verified = updateCaseStatus(caseRecord, CASE_STATUSES.VERIFIED, normalizedActor, 'case_verified', {
      verified_by: normalizedActor.id,
      verified_at: isoNow(now),
    });
    recordTimeline({ patientId: caseRecord.patient_id, caseId, eventType: 'clinician_verified', actor: normalizedActor });
    return deepClone(caseSummary(verified, allImages(), allFindings(), allExports()));
  }

  function exportCase({ caseId, format, actor, redacted = false }) {
    const normalizedActor = requireRole(actor, EXPORT_ROLES);
    const caseRecord = getCaseOrThrow(caseId);
    if (!caseRecord.patient_id) throw new Error('patient_link_required');
    if (!['json', 'pdf'].includes(format)) throw new Error('unsupported_export_format');
    const caseImages = allImages().filter((image) => image.case_id === caseId && !image.archived);
    const caseQuality = allQualityChecks().filter((check) => check.case_id === caseId);
    const caseAiFindings = allAiFindings().filter((finding) => finding.case_id === caseId);
    const caseClinicianFindings = allClinicianFindings().filter((finding) => finding.case_id === caseId);
    const caseAudit = [...auditEvents.values()].filter((event) => event.case_id === caseId);
    const timestamp = isoNow(now);
    const exportRecord = {
      id: idFactory('export'),
      case_id: caseId,
      format,
      redacted: Boolean(redacted),
      mime_type: format === 'pdf' ? 'application/pdf' : 'application/json',
      storage_ref: `/uploads/verified-cases/${caseId}/exports/${format}-${Date.now()}`,
      exported_by: normalizedActor.id,
      exported_at: timestamp,
      payload: null,
    };
    exportRecord.payload = format === 'json'
      ? {
          case: redacted
            ? { ...deepClone(caseRecord), patient_id: 'REDACTED', patient_name: 'REDACTED', patient_code: 'REDACTED' }
            : deepClone(caseRecord),
          images: deepClone(caseImages),
          quality_checks: deepClone(caseQuality),
          ai_findings: deepClone(caseAiFindings),
          clinician_findings: deepClone(caseClinicianFindings),
          audit_events: deepClone(caseAudit),
          timeline_linkage: {
            patient_id: redacted ? 'REDACTED' : caseRecord.patient_id,
            linked: Boolean(caseRecord.patient_id),
          },
        }
      : buildPdfPayload({ caseRecord, images: caseImages, qualityChecks: caseQuality, aiFindings: caseAiFindings, clinicianFindings: caseClinicianFindings, auditEvents: caseAudit, redacted });
    exportsById.set(exportRecord.id, exportRecord);

    const before = deepClone(caseRecord);
    caseRecord.status = CASE_STATUSES.EXPORTED;
    caseRecord.exported_at = timestamp;
    caseRecord.updated_at = timestamp;
    recordAudit({ caseId, actor: normalizedActor, eventType: 'case_exported', before, after: { case: caseRecord, export: exportRecord } });
    recordTimeline({ patientId: caseRecord.patient_id, caseId, eventType: 'report_exported', actor: normalizedActor, details: { report_link: exportRecord.storage_ref, export_id: exportRecord.id, format } });
    return deepClone(exportRecord);
  }

  function listExports(caseId) {
    getCaseOrThrow(caseId);
    return allExports()
      .filter((entry) => entry.case_id === caseId)
      .sort((a, b) => new Date(b.exported_at) - new Date(a.exported_at))
      .map(deepClone);
  }

  function archiveCase({ caseId, actor, reason = null }) {
    const normalizedActor = requireRole(actor, CLINICIAN_ROLES);
    const caseRecord = getCaseOrThrow(caseId);
    const before = deepClone(caseRecord);
    caseRecord.status = CASE_STATUSES.ARCHIVED;
    caseRecord.archived_at = isoNow(now);
    caseRecord.updated_at = isoNow(now);
    recordAudit({ caseId, actor: normalizedActor, eventType: 'case_archived', before, after: caseRecord, reason });
    return deepClone(caseSummary(caseRecord, allImages(), allFindings(), allExports()));
  }

  function listAuditEvents(caseId) {
    getCaseOrThrow(caseId);
    return [...auditEvents.values()]
      .filter((event) => event.case_id === caseId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(deepClone);
  }

  function deleteAuditEvent() {
    throw new Error('audit_events_are_immutable');
  }

  function getPatientTimeline(patientId) {
    return [...timelineEvents.values()]
      .filter((event) => event.patient_id === patientId)
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
      .map(deepClone);
  }

  function getSessionCase(sessionId) {
    const match = [...cases.values()].find((caseRecord) => caseRecord.session_id === sessionId && caseRecord.status !== CASE_STATUSES.ARCHIVED);
    return match ? getCase(match.id) : null;
  }

  function linkSessionCase({ sessionId, caseId, actor }) {
    const normalizedActor = requireRole(actor, CLINICIAN_ROLES);
    const caseRecord = getCaseOrThrow(caseId);
    const before = deepClone(caseRecord);
    caseRecord.session_id = sessionId;
    caseRecord.updated_at = isoNow(now);
    recordAudit({ caseId, actor: normalizedActor, eventType: 'case_updated', before, after: caseRecord, reason: 'Linked case to session' });
    return getCase(caseId);
  }

  return {
    createCase,
    listCases,
    getCase,
    patchCase,
    archiveCase,
    linkPatient,
    addCaseImage,
    listImages,
    removeCaseImage,
    runQualityCheck,
    recordImageAnalysis,
    listFindings,
    createClinicianFinding,
    updateFinding,
    confirmFinding,
    rejectFinding,
    verifyCase,
    exportCase,
    listExports,
    listAuditEvents,
    deleteAuditEvent,
    getPatientTimeline,
    getSessionCase,
    linkSessionCase,
  };
}

export const verifiedCaseWorkspaceStore = createVerifiedCaseWorkspaceStore();
