export const CASE_HISTORY_FILTERS = Object.freeze([
  'all',
  'draft',
  'pending_review',
  'verified',
  'exported',
  'has_images',
  'low_quality',
]);

const STATUS_META = Object.freeze({
  draft: { label: 'Draft', tone: 'slate' },
  images_uploaded: { label: 'Images uploaded', tone: 'blue' },
  quality_checked: { label: 'Quality checked', tone: 'cyan' },
  analysis_completed: { label: 'Analysis complete', tone: 'indigo' },
  pending_clinician_review: { label: 'Pending review', tone: 'amber' },
  verified: { label: 'Verified', tone: 'emerald' },
  exported: { label: 'Exported', tone: 'violet' },
  archived: { label: 'Archived', tone: 'rose' },
});

export function getCaseStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.draft;
}

function toDateValue(value) {
  const date = value ? new Date(value) : new Date(0);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function titleFromSession(session = {}) {
  return session.metadata?.title || session.title || `Session ${session.id || ''}`.trim() || 'Untitled session';
}

function previewFromSession(session = {}) {
  return session.last_message_preview || session.metadata?.last_message_preview || session.preview || '';
}

function normalizeCaseItem(caseRecord = {}) {
  const status = caseRecord.status || 'draft';
  const patientLabel = caseRecord.patient_name || caseRecord.patient_code || caseRecord.patient_id || '';
  const updatedAt = caseRecord.updated_at || caseRecord.created_at || new Date().toISOString();
  const findingLabels = Array.isArray(caseRecord.finding_labels) ? caseRecord.finding_labels : [];

  return {
    type: 'case',
    id: caseRecord.id,
    caseId: caseRecord.id,
    sessionId: caseRecord.session_id || null,
    title: caseRecord.title || 'Clinical case',
    patientLabel,
    patientName: caseRecord.patient_name || '',
    patientCode: caseRecord.patient_code || '',
    lastMessagePreview: caseRecord.last_message_preview || findingLabels.join(', ') || '',
    updatedAt,
    createdAt: caseRecord.created_at || updatedAt,
    imageCount: Number(caseRecord.image_count || 0),
    status,
    statusMeta: getCaseStatusMeta(status),
    timelineLinked: Boolean(caseRecord.timeline_linked || caseRecord.patient_id),
    hasLowQualityImages: Boolean(caseRecord.has_low_quality_images),
    findingLabels,
    raw: caseRecord,
  };
}

function normalizeSessionItem(session = {}, linkedCaseIds = new Set()) {
  const updatedAt = session.updated_at || session.created_at || new Date().toISOString();
  return {
    type: 'chat',
    id: session.id,
    sessionId: session.id,
    caseId: null,
    title: titleFromSession(session),
    patientLabel: session.metadata?.patient_name || session.metadata?.patient_code || '',
    patientName: session.metadata?.patient_name || '',
    patientCode: session.metadata?.patient_code || '',
    lastMessagePreview: previewFromSession(session),
    updatedAt,
    createdAt: session.created_at || updatedAt,
    imageCount: Number(session.metadata?.image_count || 0),
    status: linkedCaseIds.has(session.id) ? 'case_linked' : 'chat',
    statusMeta: linkedCaseIds.has(session.id)
      ? { label: 'Case linked', tone: 'indigo' }
      : { label: 'Chat', tone: 'slate' },
    timelineLinked: false,
    hasLowQualityImages: false,
    findingLabels: [],
    raw: session,
  };
}

export function buildClinicalHistoryItems({ sessions = [], cases = [] } = {}) {
  const linkedSessionIds = new Set(cases.map((caseRecord) => caseRecord.session_id).filter(Boolean));
  const caseItems = cases.map(normalizeCaseItem);
  const caseSessionIds = new Set(caseItems.map((item) => item.sessionId).filter(Boolean));
  const chatItems = sessions
    .filter((session) => !caseSessionIds.has(session.id))
    .map((session) => normalizeSessionItem(session, linkedSessionIds));

  return [...caseItems, ...chatItems].sort((a, b) => toDateValue(b.updatedAt) - toDateValue(a.updatedAt));
}

function matchesFilter(item, filter) {
  switch (filter) {
    case 'draft':
      return item.status === 'draft';
    case 'pending_review':
      return ['pending_clinician_review', 'analysis_completed', 'quality_checked'].includes(item.status);
    case 'verified':
      return item.status === 'verified';
    case 'exported':
      return item.status === 'exported';
    case 'has_images':
      return item.imageCount > 0;
    case 'low_quality':
      return item.hasLowQualityImages;
    case 'all':
    default:
      return true;
  }
}

function matchesQuery(item, query) {
  const clean = query.trim().toLowerCase();
  if (!clean) return true;
  const haystack = [
    item.title,
    item.patientLabel,
    item.patientName,
    item.patientCode,
    item.caseId,
    item.sessionId,
    item.lastMessagePreview,
    ...(item.findingLabels || []),
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(clean);
}

export function filterClinicalHistoryItems(items = [], { filter = 'all', query = '' } = {}) {
  return items.filter((item) => matchesFilter(item, filter) && matchesQuery(item, query));
}

export function imageFingerprint(file = {}) {
  return [
    file.size || 0,
    file.type || file.mimetype || '',
    file.lastModified || file.last_modified || 0,
  ].join(':');
}

export function validateWorkspaceImages(files = [], {
  maxSizeBytes = 12 * 1024 * 1024,
  existingFingerprints = new Set(),
  allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
} = {}) {
  const seen = new Set(existingFingerprints);
  const accepted = [];
  const rejected = [];

  Array.from(files).forEach((file) => {
    const type = file.type || file.mimetype || '';
    const fingerprint = imageFingerprint(file);

    if (!allowedTypes.has(type)) {
      rejected.push({ file, reason: 'unsupported_file_type' });
      return;
    }
    if (Number(file.size || 0) > maxSizeBytes) {
      rejected.push({ file, reason: 'file_too_large' });
      return;
    }
    if (seen.has(fingerprint)) {
      rejected.push({ file, reason: 'duplicate_image' });
      return;
    }

    seen.add(fingerprint);
    accepted.push({ file, fingerprint });
  });

  return { accepted, rejected, fingerprints: seen };
}

export function createWorkspaceRaceGuard() {
  let activeToken = null;
  let activeKey = null;

  return {
    start(key) {
      const token = Symbol(key || 'workspace-request');
      activeToken = token;
      activeKey = key;
      return {
        key,
        isActive: () => activeToken === token,
        cancel: () => {
          if (activeToken === token) {
            activeToken = null;
            activeKey = null;
          }
        },
      };
    },
    currentKey: () => activeKey,
    cancel: () => {
      activeToken = null;
      activeKey = null;
    },
  };
}

export function buildQualityMetricsFromFile(file = {}, dimensions = {}) {
  return {
    width: Number(dimensions.width || file.width || 0),
    height: Number(dimensions.height || file.height || 0),
    blur: Number(file.blur || 0.1),
    brightness: Number(file.brightness || 0.5),
    contrast: Number(file.contrast || 0.65),
    dentalRelevance: file.dentalRelevance ?? 0.9,
    teethVisible: file.teethVisible ?? true,
    faceVisible: file.faceVisible ?? false,
  };
}
