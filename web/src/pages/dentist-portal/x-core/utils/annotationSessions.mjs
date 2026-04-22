const SESSION_VERSION = 1;

const safeKeyPart = (value) => String(value || '')
  .trim()
  .replace(/[^a-zA-Z0-9_.-]/g, '_')
  .slice(0, 120);

const makeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getAnnotationSessionStorageKey = ({ study, studyKey, seriesUid, viewerType }) => {
  const resolvedStudyKey = studyKey || study?.id || study?.folderName || study?.studyKey || study?.originalName || '';
  if (!resolvedStudyKey || !seriesUid || !viewerType) return '';
  return `xcore.annotationSessions.${safeKeyPart(resolvedStudyKey)}.${safeKeyPart(seriesUid)}.${safeKeyPart(viewerType)}`;
};

export const loadLocalAnnotationSessions = (scope) => {
  const key = getAnnotationSessionStorageKey(scope);
  if (!key || typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed?.version !== SESSION_VERSION || !Array.isArray(parsed.sessions)) return [];
    return parsed.sessions;
  } catch (error) {
    console.warn('[X-Core] Failed to load local annotation sessions:', error);
    return [];
  }
};

const writeLocalAnnotationSessions = (scope, sessions) => {
  const key = getAnnotationSessionStorageKey(scope);
  if (!key || typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify({
      version: SESSION_VERSION,
      sessions,
    }));
  } catch (error) {
    console.warn('[X-Core] Failed to save local annotation sessions:', error);
  }
};

export const saveLocalAnnotationSession = (scope, { note = '', annotations = [], featureState = {}, source = 'local' }) => {
  const sessions = loadLocalAnnotationSessions(scope);
  const now = new Date().toISOString();
  const snapshot = {
    id: `local-${makeId()}`,
    study_id: scope?.study?.id || scope?.studyKey || null,
    series_uid: scope?.seriesUid || '',
    snapshot_at: now,
    created_by: null,
    note: note || '',
    annotations: Array.isArray(annotations) ? annotations : [],
    feature_state: featureState || {},
    local: true,
    source,
  };
  const nextSessions = [snapshot, ...sessions].slice(0, 100);
  writeLocalAnnotationSessions(scope, nextSessions);
  return snapshot;
};

export const deleteLocalAnnotationSession = (scope, snapshotId) => {
  const sessions = loadLocalAnnotationSessions(scope);
  const nextSessions = sessions.filter((snapshot) => snapshot.id !== snapshotId);
  writeLocalAnnotationSessions(scope, nextSessions);
  return nextSessions;
};

export const mergeAnnotationSessions = (serverSessions = [], localSessions = []) => {
  const byId = new Map();
  [...localSessions, ...serverSessions].forEach((snapshot) => {
    if (!snapshot?.id) return;
    byId.set(snapshot.id, snapshot);
  });
  return [...byId.values()].sort((a, b) => (
    new Date(b.snapshot_at || 0).getTime() - new Date(a.snapshot_at || 0).getTime()
  ));
};
