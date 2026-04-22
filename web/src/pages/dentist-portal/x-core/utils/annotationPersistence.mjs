export const getDeletedAnnotationIds = (knownIds, annotations = []) => {
  const currentIds = new Set((annotations || []).map((annotation) => annotation.id).filter(Boolean));
  return [...(knownIds || [])].filter((id) => !currentIds.has(id));
};

export const buildAnnotationDraftBackup = ({
  version,
  annotations = [],
  deletedAnnotationIds = [],
  updatedAt = new Date().toISOString(),
}) => ({
  version,
  updatedAt,
  annotations: Array.isArray(annotations) ? annotations : [],
  deletedAnnotationIds: Array.isArray(deletedAnnotationIds) ? deletedAnnotationIds : [],
});

export const readAnnotationDraftBackup = (raw, expectedVersion) => {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed?.version !== expectedVersion || !Array.isArray(parsed.annotations)) return null;
    return parsed;
  } catch {
    return null;
  }
};
