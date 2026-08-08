import crypto from 'crypto';

export const REPORT_RENDER_TYPES = Object.freeze(['CLEAN', 'ANNOTATED']);
export const REPORT_RENDER_VERSION = 2;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function reportError(status, message, code, details = undefined) {
  return Object.assign(new Error(message), { status, code, details });
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      if (value[key] !== undefined) result[key] = stableValue(value[key]);
      return result;
    }, {});
  }
  return typeof value === 'bigint' ? value.toString() : value;
}

export function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function stringValue(value, maxLength) {
  const result = value == null ? '' : String(value).trim();
  return result.slice(0, maxLength);
}

export function normalizeStructuredFindings(value = []) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw reportError(400, 'Temuan terstruktur harus berupa daftar.', 'invalid_structured_findings');
  }
  if (value.length > 100) {
    throw reportError(400, 'Satu radiografi tidak dapat memiliki lebih dari 100 temuan.', 'too_many_structured_findings');
  }

  const normalized = value.map((finding, index) => {
    const id = stringValue(finding?.id, 64);
    const annotationId = stringValue(finding?.annotation_id ?? finding?.annotationId, 120);
    const measurementId = stringValue(finding?.measurement_id ?? finding?.measurementId, 120) || null;
    const markerNumber = Number(finding?.marker_number ?? finding?.markerNumber);
    const displayOrder = Number(finding?.display_order ?? finding?.displayOrder ?? index);
    const description = stringValue(finding?.description, 10000);

    if (!UUID_PATTERN.test(id)) {
      throw reportError(400, `Temuan ${index + 1} harus memiliki ID UUID yang stabil.`, 'invalid_finding_id');
    }
    if (!annotationId) {
      throw reportError(400, `Temuan ${index + 1} harus terhubung ke anotasi lokasi.`, 'finding_annotation_required');
    }
    if (!Number.isInteger(markerNumber) || markerNumber < 1 || markerNumber > 999) {
      throw reportError(400, `Nomor marker temuan ${index + 1} tidak valid.`, 'invalid_finding_marker');
    }
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      throw reportError(400, `Urutan temuan ${index + 1} tidak valid.`, 'invalid_finding_order');
    }
    if (!description) {
      throw reportError(400, `Uraian temuan ${markerNumber} wajib diisi.`, 'finding_description_required');
    }

    return {
      id,
      marker_number: markerNumber,
      annotation_id: annotationId,
      measurement_id: measurementId,
      region: stringValue(finding?.region, 255) || null,
      tooth_numbers: Array.isArray(finding?.tooth_numbers)
        ? [...new Set(finding.tooth_numbers.map(String).map((entry) => entry.trim()).filter(Boolean))]
        : [],
      title: stringValue(finding?.title, 255) || null,
      description,
      annotation_type: stringValue(finding?.annotation_type ?? finding?.annotationType, 32) || null,
      display_order: displayOrder,
    };
  }).sort((a, b) => a.display_order - b.display_order || a.marker_number - b.marker_number);

  const markerNumbers = new Set(normalized.map((finding) => finding.marker_number));
  const ids = new Set(normalized.map((finding) => finding.id));
  if (markerNumbers.size !== normalized.length) {
    throw reportError(400, 'Nomor marker harus unik di dalam satu radiografi.', 'duplicate_finding_marker');
  }
  if (ids.size !== normalized.length) {
    throw reportError(400, 'ID temuan harus unik di dalam satu radiografi.', 'duplicate_finding_id');
  }
  return normalized;
}

function annotationForFingerprint(annotation) {
  return {
    id: String(annotation.id),
    type: annotation.type || annotation.annotation_type,
    coordinates: annotation.coordinates || {},
    label: annotation.label || null,
    color: annotation.color || null,
    metadata: annotation.metadata || {},
    slice_axis: annotation.slice_axis ?? null,
    slice_index: annotation.slice_index ?? null,
  };
}

export function computeAnalysisFingerprint(item, annotations = []) {
  const payload = {
    schema: 'xcore-report-render-v2',
    item: {
      id: item.id,
      study_id: String(item.study_id ?? item.studyId),
      series_uid: item.series_uid ?? item.seriesUid,
      sop_instance_uid: item.sop_instance_uid ?? item.sopInstanceUid ?? null,
      instance_number: item.instance_number ?? item.instanceNumber ?? null,
      frame_index: item.frame_index ?? item.frameIndex ?? null,
      image_index: item.image_index ?? item.imageIndex ?? null,
      source_instance_key: item.source_instance_key ?? item.sourceInstanceKey ?? null,
      viewer_type: item.viewer_type ?? item.viewerType,
      radiograph_type: item.radiograph_type ?? item.radiographType,
      tooth_numbers: item.tooth_numbers ?? item.toothNumbers ?? [],
      findings: item.findings || null,
      structured_findings: normalizeStructuredFindings(item.structured_findings ?? item.structuredFindings ?? []),
    },
    annotations: annotations.map(annotationForFingerprint).sort((a, b) => a.id.localeCompare(b.id)),
  };
  return crypto.createHash('sha256').update(stableJson(payload)).digest('hex');
}

export function validateFindingAnnotationLinks(findings, annotations) {
  const annotationMap = new Map(annotations.map((annotation) => [String(annotation.id), annotation]));
  const errors = [];
  findings.forEach((finding) => {
    const annotation = annotationMap.get(String(finding.annotation_id));
    if (!annotation) {
      errors.push({
        code: 'finding_annotation_not_found',
        marker_number: finding.marker_number,
        annotation_id: finding.annotation_id,
        message: `Marker ${finding.marker_number} merujuk anotasi yang tidak tersedia pada radiografi ini.`,
      });
      return;
    }
    if (finding.measurement_id && !annotationMap.has(String(finding.measurement_id))) {
      errors.push({
        code: 'finding_measurement_not_found',
        marker_number: finding.marker_number,
        measurement_id: finding.measurement_id,
        message: `Pengukuran untuk marker ${finding.marker_number} tidak tersedia pada radiografi ini.`,
      });
    }
  });
  return errors;
}

export function resolveRenderFreshness({ latestAnnotated, latestClean, currentFingerprint, legacyPath }) {
  if (!latestAnnotated) {
    return legacyPath
      ? { status: 'LEGACY', ready: false, message: 'Gambar laporan lama perlu diperbarui ke canonical render.' }
      : { status: 'MISSING', ready: false, message: 'Gambar laporan belum tersedia.' };
  }
  if (latestAnnotated.analysis_fingerprint !== currentFingerprint) {
    return { status: 'STALE', ready: false, message: 'Anotasi atau temuan berubah setelah gambar laporan dibuat.' };
  }
  return {
    status: 'READY',
    ready: true,
    message: latestClean ? 'Gambar laporan siap.' : 'Gambar beranotasi siap; gambar bersih belum tersedia.',
  };
}

export function normalizeRenderMetadata(metadata, { item, renderType }) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw reportError(400, `Metadata render ${renderType} wajib diisi.`, 'render_metadata_required');
  }
  const viewerType = stringValue(metadata.viewer_type ?? metadata.viewerType, 16).toLowerCase();
  const seriesUid = stringValue(metadata.series_uid ?? metadata.seriesUid, 512);
  const itemId = stringValue(metadata.case_item_id ?? metadata.caseItemId, 64);
  const studyId = stringValue(metadata.study_id ?? metadata.studyId, 64);
  const declaredRenderType = stringValue(metadata.render_type ?? metadata.renderType, 16).toUpperCase();
  const renderVersion = Number(metadata.report_render_version ?? metadata.reportRenderVersion);
  if (renderVersion !== REPORT_RENDER_VERSION) {
    throw reportError(400, 'Versi canonical report render tidak didukung.', 'unsupported_report_render_version');
  }
  const sourceInstanceKey = stringValue(metadata.source_instance_key ?? metadata.sourceInstanceKey, 512);
  const itemKey = item.source_instance_key ?? item.sourceInstanceKey ?? null;
  if (
    viewerType !== item.viewer_type
    || seriesUid !== item.series_uid
    || itemId !== item.id
    || studyId !== String(item.study_id)
    || (declaredRenderType && declaredRenderType !== renderType)
    || (sourceInstanceKey && itemKey && sourceInstanceKey !== itemKey)
  ) {
    throw reportError(400, 'Metadata render tidak sesuai dengan item kasus.', 'render_scope_mismatch');
  }

  const result = {
    report_render_version: REPORT_RENDER_VERSION,
    render_type: renderType,
    case_item_id: item.id,
    study_id: studyId,
    series_uid: item.series_uid,
    sop_instance_uid: item.sop_instance_uid ?? item.sopInstanceUid ?? null,
    instance_number: item.instance_number ?? item.instanceNumber ?? null,
    frame_index: item.frame_index ?? item.frameIndex ?? null,
    image_index: item.image_index ?? item.imageIndex ?? null,
    source_instance_key: item.source_instance_key ?? item.sourceInstanceKey ?? null,
    source_kind: item.source_kind ?? item.sourceKind ?? metadata.source_kind ?? metadata.sourceKind ?? null,
    viewer_type: item.viewer_type,
    source_width: Number(metadata.source_width ?? metadata.sourceWidth) || null,
    source_height: Number(metadata.source_height ?? metadata.sourceHeight) || null,
    render_width: Number(metadata.render_width ?? metadata.renderWidth) || null,
    render_height: Number(metadata.render_height ?? metadata.renderHeight) || null,
    window_center: Number.isFinite(Number(metadata.window_center ?? metadata.windowCenter)) ? Number(metadata.window_center ?? metadata.windowCenter) : null,
    window_width: Number.isFinite(Number(metadata.window_width ?? metadata.windowWidth)) ? Number(metadata.window_width ?? metadata.windowWidth) : null,
    invert: Boolean(metadata.invert ?? metadata.inverted),
    rotation: Number(metadata.rotation) || 0,
    slice_index: Number.isInteger(Number(metadata.slice_index ?? metadata.sliceIndex)) ? Number(metadata.slice_index ?? metadata.sliceIndex) : null,
    slice_axis: stringValue(metadata.slice_axis ?? metadata.sliceAxis, 24) || null,
    view_mode: stringValue(metadata.view_mode ?? metadata.viewMode, 32) || null,
    pixel_spacing: metadata.pixel_spacing ?? metadata.pixelSpacing ?? null,
    rendered_at: stringValue(metadata.rendered_at ?? metadata.renderedAt, 64) || new Date().toISOString(),
    annotation_revision: stringValue(metadata.annotation_revision ?? metadata.annotationRevision, 128) || null,
    marker_count: Number.isInteger(Number(metadata.marker_count ?? metadata.markerCount))
      ? Number(metadata.marker_count ?? metadata.markerCount)
      : 0,
  };
  if (result.rotation % 90 !== 0) {
    throw reportError(400, 'Rotasi render harus kelipatan 90 derajat.', 'invalid_render_rotation');
  }
  if (result.window_width != null && result.window_width <= 0) {
    throw reportError(400, 'Window width render harus lebih besar dari nol.', 'invalid_render_window');
  }
  if (result.slice_index != null && result.slice_index < 0) {
    throw reportError(400, 'Slice index render tidak valid.', 'invalid_render_slice');
  }
  if (result.marker_count < 0 || result.marker_count > 100) {
    throw reportError(400, 'Jumlah marker render tidak valid.', 'invalid_render_marker_count');
  }
  if (Number.isNaN(Date.parse(result.rendered_at))) {
    throw reportError(400, 'Waktu render tidak valid.', 'invalid_render_timestamp');
  }
  if (renderType === 'ANNOTATED') {
    const expectedCount = Array.isArray(item.structured_findings || item.structuredFindings)
      ? (item.structured_findings || item.structuredFindings).length
      : 0;
    if (result.marker_count !== expectedCount) {
      throw reportError(400, 'Jumlah marker render beranotasi tidak sesuai dengan temuan terstruktur.', 'render_marker_count_mismatch');
    }
  }
  return result;
}

export function assertFindingLinks(findings, annotations) {
  const errors = validateFindingAnnotationLinks(findings, annotations);
  if (errors.length) {
    throw reportError(409, 'Temuan dan marker belum lengkap.', 'finding_marker_mismatch', { issues: errors });
  }
}
