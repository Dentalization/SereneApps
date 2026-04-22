import { getAccessToken } from '../../../../utils/auth/tokenStorage';

const API_BASE = '/api/v1/x-core';
export const ANNOTATION_KEEPALIVE_MAX_BYTES = 60000;

const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const normalizeAnnotationForPersistence = (annotation, scope = {}) => {
  const metadata = {
    ...(annotation.metadata || {}),
  };
  const type = annotation.type || annotation.annotation_type;

  if (scope.sourceWidth && !metadata.source_width) {
    metadata.source_width = scope.sourceWidth;
  }
  if (scope.sourceHeight && !metadata.source_height) {
    metadata.source_height = scope.sourceHeight;
  }
  if (type && type !== 'text') {
    metadata.finding_type = metadata.finding_type || 'other';
    metadata.severity = metadata.severity || 'S1';
  }

  return {
    ...annotation,
    series_uid: annotation.series_uid || scope.seriesUid || scope.series_uid || '',
    viewer_type: annotation.viewer_type || scope.viewerType || scope.viewer_type || '',
    slice_axis: annotation.slice_axis ?? scope.sliceAxis ?? scope.slice_axis ?? null,
    slice_index: annotation.slice_index ?? scope.sliceIndex ?? scope.slice_index ?? null,
    annotation_type: annotation.annotation_type || type,
    type,
    metadata,
    review_status: annotation.review_status || annotation.reviewStatus || 'draft',
    reviewed_by: annotation.reviewed_by ?? annotation.reviewedBy ?? null,
    reviewed_at: annotation.reviewed_at || annotation.reviewedAt || null,
    reviewer_comment: annotation.reviewer_comment || annotation.reviewerComment || null,
    confidence_score: annotation.confidence_score ?? annotation.confidenceScore ?? 0.7,
    created_at: annotation.created_at || annotation.createdAt || new Date().toISOString(),
  };
};

export const buildAnnotationSavePayload = ({ seriesUid, viewerType, annotations, deletedAnnotationIds = [] }) => ({
  series_uid: seriesUid,
  viewer_type: viewerType,
  annotations: Array.isArray(annotations) ? annotations : [],
  deleted_annotation_ids: Array.isArray(deletedAnnotationIds) ? deletedAnnotationIds : [],
});

export const loadStudyAnnotations = async (studyId, { seriesUid, viewerType, tooth, reviewStatus } = {}) => {
  if (!studyId || !seriesUid || !viewerType) return [];

  const params = new URLSearchParams({
    series_uid: seriesUid,
    viewer_type: viewerType,
  });
  if (tooth) params.set('tooth', String(tooth));
  if (reviewStatus) params.set('review_status', reviewStatus);

  const response = await fetch(`${API_BASE}/studies/${encodeURIComponent(studyId)}/annotations?${params}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Annotation load failed (${response.status})`);
  }

  const payload = await response.json();
  return Array.isArray(payload.annotations) ? payload.annotations : [];
};

export const saveStudyAnnotations = async (
  studyId,
  { seriesUid, viewerType, annotations, deletedAnnotationIds = [] },
  options = {}
) => {
  if (!studyId || !seriesUid || !viewerType) return null;

  const body = JSON.stringify(buildAnnotationSavePayload({
    seriesUid,
    viewerType,
    annotations,
    deletedAnnotationIds,
  }));
  const useKeepalive = Boolean(options.keepalive) && body.length <= ANNOTATION_KEEPALIVE_MAX_BYTES;

  const response = await fetch(`${API_BASE}/studies/${encodeURIComponent(studyId)}/annotations`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body,
    keepalive: useKeepalive,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error || `Annotation save failed (${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return response.json();
};

export const saveAnnotationSnapshot = async (studyId, { seriesUid, note, annotations, featureState = {} }) => {
  if (!studyId || !seriesUid) return null;

  const response = await fetch(`${API_BASE}/studies/${encodeURIComponent(studyId)}/annotation-snapshots`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      series_uid: seriesUid,
      note: note || '',
      annotations: Array.isArray(annotations) ? annotations : [],
      feature_state: featureState && typeof featureState === 'object' ? featureState : {},
    }),
  });

  if (!response.ok) {
    throw new Error(`Annotation snapshot save failed (${response.status})`);
  }

  return response.json();
};

export const loadAnnotationSnapshots = async (studyId, { seriesUid } = {}) => {
  if (!studyId || !seriesUid) return [];

  const params = new URLSearchParams({ series_uid: seriesUid });
  const response = await fetch(`${API_BASE}/studies/${encodeURIComponent(studyId)}/annotation-snapshots?${params}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Annotation snapshot load failed (${response.status})`);
  }

  const payload = await response.json();
  return Array.isArray(payload.snapshots) ? payload.snapshots : [];
};

export const deleteAnnotationSnapshot = async (studyId, snapshotId) => {
  if (!studyId || !snapshotId) return null;

  const response = await fetch(`${API_BASE}/studies/${encodeURIComponent(studyId)}/annotation-snapshots/${encodeURIComponent(snapshotId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Annotation snapshot delete failed (${response.status})`);
  }

  return response.json();
};

export const reviewStudyAnnotations = async (studyId, { annotationIds, seriesUid, viewerType, reviewStatus, reviewerComment }) => {
  if (!studyId || !reviewStatus) return null;

  const response = await fetch(`${API_BASE}/studies/${encodeURIComponent(studyId)}/annotations/review`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      annotation_ids: Array.isArray(annotationIds) ? annotationIds : [],
      series_uid: seriesUid,
      viewer_type: viewerType,
      review_status: reviewStatus,
      reviewer_comment: reviewerComment || '',
    }),
  });

  if (!response.ok) {
    throw new Error(`Annotation review update failed (${response.status})`);
  }

  return response.json();
};
