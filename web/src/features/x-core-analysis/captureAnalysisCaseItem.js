import { buildCanonical2DReportRenders } from './canonicalReportRender.mjs';

/**
 * X-Core Phase 7 Capture Orchestrator
 * Deterministic execution pipeline for capturing analysis case report renders.
 * 
 * Hard Rules:
 * 1. Image must be fully loaded (complete && naturalWidth > 0).
 * 2. Annotations must be hydrated (persistence.hydrated === true).
 * 3. Annotation flush must succeed. NO in-memory fallback if flush fails to preserve DB-report integrity.
 */
export async function captureAnalysisCaseItem({
  imgRef,
  annotations = [],
  measurementClinicalRecords = [],
  measurements = [],
  findings = [],
  persistence = null,
  onCaptureForCase,
  analysisCaseContext,
  study,
  seriesUid,
  effectiveImageFilter = 'none',
  effectivePixelSpacing = null,
  windowCenter = null,
  windowWidth = null,
  inverted = false,
  drawAnnotations,
  drawMeasurements,
  drawScaleBar,
  getScaleBar,
  forcedAnnotations = null,
}) {
  if (!onCaptureForCase) {
    throw new Error('Callback onCaptureForCase tidak tersedia.');
  }

  // 1. Image Readiness Guard
  const img = imgRef?.current;
  const sourceWidth = img?.naturalWidth || 0;
  const sourceHeight = img?.naturalHeight || 0;
  if (!img || !img.complete || sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('Radiografi belum selesai dimuat oleh browser.');
  }

  // 2. Annotation Hydration Guard
  if (persistence && typeof persistence.hydrated === 'boolean' && !persistence.hydrated) {
    throw new Error('Anotasi sedang dimuat, harap tunggu.');
  }

  // 3. Flush Pending Annotations (HARD PREREQUISITE: stop on failure)
  let activeAnnotations = Array.isArray(forcedAnnotations) ? forcedAnnotations : annotations;
  if (persistence && typeof persistence.flushPendingSave === 'function') {
    try {
      const saveResult = await persistence.flushPendingSave();
      if (saveResult && Array.isArray(saveResult.annotations) && !Array.isArray(forcedAnnotations)) {
        activeAnnotations = saveResult.annotations;
      }
    } catch (flushError) {
      console.error('[CaptureOrchestrator] flushPendingSave failed:', flushError);
      const apiMessage = String(
        flushError?.payload?.error
        || flushError?.message
        || ''
      ).trim();
      throw new Error(apiMessage
        ? `Anotasi belum berhasil disimpan ke database: ${apiMessage}`
        : 'Anotasi belum berhasil disimpan ke database. Harap coba lagi.');
    }
  }

  // 4. Build Canonical 2D Report Renders
  const renders = buildCanonical2DReportRenders({
    image: img,
    sourceWidth,
    sourceHeight,
    imageFilter: effectiveImageFilter,
    annotations: activeAnnotations,
    markerAnnotations: [...activeAnnotations, ...measurementClinicalRecords],
    measurements,
    findings: analysisCaseContext?.structuredFindings || analysisCaseContext?.structured_findings || findings || [],
    pixelSpacing: effectivePixelSpacing,
    drawAnnotations,
    drawMeasurements,
    drawScaleBar,
    getScaleBar,
    metadata: {
      case_item_id: analysisCaseContext?.itemId,
      study_id: study?.id,
      series_uid: seriesUid,
      source_instance_key: analysisCaseContext?.sourceInstanceKey || analysisCaseContext?.source_instance_key || null,
      source_kind: analysisCaseContext?.sourceKind || analysisCaseContext?.source_kind || null,
      window_center: windowCenter,
      window_width: windowWidth,
      invert: Boolean(inverted),
      rotation: 0,
      annotation_revision: activeAnnotations.map((entry) => `${entry.id}:${entry.updated_at || entry.created_at || ''}`).join('|'),
    },
  });

  // 5. Persist Render via Backend API
  const persistedResult = await onCaptureForCase(renders);
  return persistedResult;
}
