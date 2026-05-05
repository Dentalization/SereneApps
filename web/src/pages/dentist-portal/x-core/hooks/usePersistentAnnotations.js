import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadStudyAnnotations,
  normalizeAnnotationForPersistence,
  saveStudyAnnotations,
} from '../utils/annotationApi';
import {
  buildAnnotationDraftBackup,
  getDeletedAnnotationIds,
  readAnnotationDraftBackup,
} from '../utils/annotationPersistence.mjs';

const SAVE_DEBOUNCE_MS = 500;
const DRAFT_VERSION = 1;
const CACHE_VERSION = 1;

const studyIdForApi = (study) => {
  if (!study || study.readOnly) return '';
  const candidate = study.id ?? '';
  return /^\d+$/.test(String(candidate)) ? String(candidate) : '';
};

const studyKeyForStorage = (study) => {
  if (!study || study.readOnly) return '';
  return String(study.id || study.folderName || study.studyKey || study.originalName || '').trim();
};

export default function usePersistentAnnotations({
  study,
  seriesUid,
  viewerType,
  annotations,
  setAnnotations,
  enabled,
  scope = {},
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const hydratedRef = useRef(false);
  const loadKeyRef = useRef('');
  const saveTimerRef = useRef(null);
  const scopeRef = useRef(scope);
  const knownIdsRef = useRef(new Set());
  const skipNextSaveRef = useRef(false);
  const flushRef = useRef(() => Promise.resolve(null));
  const changeVersionRef = useRef(0);
  const localWriteTimerRef = useRef(null);
  const annotationsRef = useRef(annotations);
  const lastAnnotationsRef = useRef(annotations);
  const lastAnnotationHashRef = useRef('');
  const studyId = studyIdForApi(study);
  const storageStudyKey = studyKeyForStorage(study);
  const loadKey = `${storageStudyKey || studyId}__${seriesUid || ''}__${viewerType || ''}`;
  const draftStorageKey = storageStudyKey && seriesUid && viewerType
    ? `xcore.annotationDraft.${storageStudyKey}.${seriesUid}.${viewerType}`
    : '';
  const cacheStorageKey = storageStudyKey && seriesUid && viewerType
    ? `xcore.annotations.${storageStudyKey}.${seriesUid}.${viewerType}`
    : '';
  const annotationHash = useMemo(() => (
    (annotations || []).map((annotation) => {
      const coordinatesLength = JSON.stringify(annotation?.coordinates || {}).length;
      return `${annotation?.id || ''}:${annotation?.review_status || ''}:${coordinatesLength}`;
    }).join('|')
  ), [annotations]);

  if (lastAnnotationsRef.current !== annotations) {
    annotationsRef.current = annotations;
    lastAnnotationsRef.current = annotations;
    if (hydratedRef.current && lastAnnotationHashRef.current !== annotationHash) {
      changeVersionRef.current += 1;
    }
    lastAnnotationHashRef.current = annotationHash;
  }

  const readDraftBackup = useCallback(() => {
    if (!draftStorageKey || typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      return readAnnotationDraftBackup(raw, DRAFT_VERSION);
    } catch (draftError) {
      console.warn('[X-Core] Annotation draft read failed:', draftError);
      return null;
    }
  }, [draftStorageKey]);

  const readLocalCache = useCallback(() => {
    if (!cacheStorageKey || typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(cacheStorageKey);
      return readAnnotationDraftBackup(raw, CACHE_VERSION);
    } catch (cacheError) {
      console.warn('[X-Core] Annotation cache read failed:', cacheError);
      return null;
    }
  }, [cacheStorageKey]);

  const writeLocalCache = useCallback((annotationsToCache, deletedAnnotationIds = []) => {
    if (!cacheStorageKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(cacheStorageKey, JSON.stringify(buildAnnotationDraftBackup({
        version: CACHE_VERSION,
        annotations: Array.isArray(annotationsToCache) ? annotationsToCache : [],
        deletedAnnotationIds,
      })));
    } catch (cacheError) {
      console.warn('[X-Core] Annotation cache write failed:', cacheError);
    }
  }, [cacheStorageKey]);

  const writeDraftBackup = useCallback((snapshot) => {
    if (!draftStorageKey || typeof window === 'undefined' || !snapshot) return;
    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(buildAnnotationDraftBackup({
        version: DRAFT_VERSION,
        annotations: snapshot.annotations,
        deletedAnnotationIds: snapshot.deletedAnnotationIds,
      })));
    } catch (draftError) {
      console.warn('[X-Core] Annotation draft write failed:', draftError);
    }
  }, [draftStorageKey]);

  const clearDraftBackup = useCallback(() => {
    if (!draftStorageKey || typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(draftStorageKey);
    } catch (draftError) {
      console.warn('[X-Core] Annotation draft cleanup failed:', draftError);
    }
  }, [draftStorageKey]);

  const cancelScheduledLocalWrite = useCallback(() => {
    if (!localWriteTimerRef.current || typeof window === 'undefined') return;
    const { id, type } = localWriteTimerRef.current;
    if (type === 'idle' && typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(id);
    } else {
      window.clearTimeout(id);
    }
    localWriteTimerRef.current = null;
  }, []);

  const scheduleLocalSnapshotWrite = useCallback((snapshot) => {
    if (!snapshot || typeof window === 'undefined') return;
    cancelScheduledLocalWrite();
    const writeSnapshot = () => {
      localWriteTimerRef.current = null;
      writeDraftBackup(snapshot);
      writeLocalCache(snapshot.annotations, snapshot.deletedAnnotationIds);
    };

    if (typeof window.requestIdleCallback === 'function') {
      localWriteTimerRef.current = {
        id: window.requestIdleCallback(writeSnapshot, { timeout: 1000 }),
        type: 'idle',
      };
      return;
    }

    localWriteTimerRef.current = {
      id: window.setTimeout(writeSnapshot, 0),
      type: 'timeout',
    };
  }, [cancelScheduledLocalWrite, writeDraftBackup, writeLocalCache]);

  const buildSaveSnapshot = useCallback(() => {
    if (!seriesUid || !viewerType) return null;
    const normalized = (annotationsRef.current || []).map((annotation) => normalizeAnnotationForPersistence(annotation, {
      ...scopeRef.current,
      seriesUid,
      viewerType,
    }));
    const deletedAnnotationIds = getDeletedAnnotationIds(knownIdsRef.current, normalized);
    return {
      annotations: normalized,
      deletedAnnotationIds,
      changeVersion: changeVersionRef.current,
    };
  }, [seriesUid, viewerType]);

  const flushPendingSave = useCallback((options = {}) => {
    if (!enabled || !studyId || !seriesUid || !viewerType || !hydratedRef.current) {
      return Promise.resolve(null);
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const snapshot = buildSaveSnapshot();
    if (!snapshot) return Promise.resolve(null);
    cancelScheduledLocalWrite();
    writeDraftBackup(snapshot);
    writeLocalCache(snapshot.annotations, snapshot.deletedAnnotationIds);

    if (!options.silent) {
      setSaving(true);
      setError(null);
    }

    return saveStudyAnnotations(studyId, {
      seriesUid,
      viewerType,
      annotations: snapshot.annotations,
      deletedAnnotationIds: snapshot.deletedAnnotationIds,
    }, { keepalive: options.keepalive })
      .then((payload) => {
        const savedAnnotations = Array.isArray(payload?.annotations) ? payload.annotations : snapshot.annotations;
        knownIdsRef.current = new Set(savedAnnotations.map((annotation) => annotation.id).filter(Boolean));
        const isLatestSave = snapshot.changeVersion === changeVersionRef.current;
        if (isLatestSave) {
          clearDraftBackup();
          writeLocalCache(savedAnnotations, []);
        }
        if (isLatestSave && Array.isArray(payload?.annotations) && !options.silent) {
          skipNextSaveRef.current = true;
          setAnnotations((current) => {
            const savedById = new Map(payload.annotations.map((annotation) => [annotation.id, annotation]));
            return current.map((annotation) => savedById.get(annotation.id) || annotation);
          });
        }
        return payload;
      })
      .catch((saveError) => {
        console.warn('[X-Core] Annotation save failed:', saveError);
        if (!options.silent) {
          setError(saveError);
        }
        throw saveError;
      })
      .finally(() => {
        if (!options.silent) setSaving(false);
      });
  }, [buildSaveSnapshot, cancelScheduledLocalWrite, clearDraftBackup, enabled, seriesUid, setAnnotations, studyId, viewerType, writeDraftBackup, writeLocalCache]);

  useEffect(() => {
    scopeRef.current = scope || {};
  }, [scope]);

  useEffect(() => {
    flushRef.current = flushPendingSave;
  }, [flushPendingSave]);

  useEffect(() => {
    hydratedRef.current = false;
    loadKeyRef.current = loadKey;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (!enabled || !seriesUid || !viewerType) {
      return undefined;
    }

    const hydrateFromLocalOnly = () => {
      const draft = readDraftBackup();
      const cache = readLocalCache();
      const localItems = Array.isArray(draft?.annotations)
        ? draft.annotations
        : Array.isArray(cache?.annotations)
          ? cache.annotations
          : null;
      if (!localItems) return false;
      const localAnnotations = localItems.map((annotation) => normalizeAnnotationForPersistence(annotation, {
        ...scopeRef.current,
        seriesUid,
        viewerType,
      }));
      skipNextSaveRef.current = true;
      setAnnotations(localAnnotations);
      knownIdsRef.current = new Set(localAnnotations.map((annotation) => annotation.id).filter(Boolean));
      hydratedRef.current = true;
      return true;
    };

    if (!studyId) {
      hydrateFromLocalOnly();
      hydratedRef.current = true;
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadStudyAnnotations(studyId, { seriesUid, viewerType })
      .then((items) => {
        if (cancelled || loadKeyRef.current !== loadKey) return;
        const serverAnnotations = items.map((annotation) => normalizeAnnotationForPersistence(annotation, {
          ...scopeRef.current,
          seriesUid,
          viewerType,
        }));
        const draft = readDraftBackup();
        const cache = readLocalCache();
        const draftAnnotations = Array.isArray(draft?.annotations)
          ? draft.annotations.map((annotation) => normalizeAnnotationForPersistence(annotation, {
            ...scopeRef.current,
            seriesUid,
            viewerType,
          }))
          : null;
        const cacheAnnotations = Array.isArray(cache?.annotations)
          ? cache.annotations.map((annotation) => normalizeAnnotationForPersistence(annotation, {
            ...scopeRef.current,
            seriesUid,
            viewerType,
          }))
          : null;
        const hydratedAnnotations = draftAnnotations || cacheAnnotations || serverAnnotations;
        skipNextSaveRef.current = !draftAnnotations && !cacheAnnotations;
        setAnnotations(hydratedAnnotations);
        knownIdsRef.current = new Set((serverAnnotations.length ? serverAnnotations : hydratedAnnotations).map((annotation) => annotation.id).filter(Boolean));
        hydratedRef.current = true;
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.warn('[X-Core] Annotation load failed:', loadError);
        setError(loadError);
        hydrateFromLocalOnly();
        hydratedRef.current = true;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, loadKey, readDraftBackup, readLocalCache, seriesUid, setAnnotations, studyId, viewerType]);

  useEffect(() => {
    if (!enabled || !seriesUid || !viewerType || !hydratedRef.current) return undefined;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return undefined;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    const snapshot = buildSaveSnapshot();
    if (snapshot) {
      scheduleLocalSnapshotWrite(snapshot);
    }

    if (studyId) {
      saveTimerRef.current = window.setTimeout(() => {
        flushPendingSave().catch(() => {});
      }, SAVE_DEBOUNCE_MS);
    }

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [annotationHash, buildSaveSnapshot, enabled, flushPendingSave, scheduleLocalSnapshotWrite, seriesUid, studyId, viewerType]);

  useEffect(() => {
    if (!enabled) return undefined;

    const flushForTermination = () => {
      flushRef.current({ keepalive: true, silent: true }).catch(() => {});
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushForTermination();
      }
    };

    window.addEventListener('pagehide', flushForTermination);
    window.addEventListener('beforeunload', flushForTermination);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      flushForTermination();
      cancelScheduledLocalWrite();
      window.removeEventListener('pagehide', flushForTermination);
      window.removeEventListener('beforeunload', flushForTermination);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cancelScheduledLocalWrite, enabled]);

  return { loading, saving, error };
}
