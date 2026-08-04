import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { buildXCoreAnalysisPdf } from './xCoreAnalysisPdf.js';
import { assertCaseOwner, validateCaseItem } from './xCoreAnalysisCaseDomain.js';
import {
  assertFindingLinks,
  computeAnalysisFingerprint,
  normalizeRenderMetadata,
  normalizeStructuredFindings,
  REPORT_RENDER_TYPES,
  resolveRenderFreshness,
  stableJson,
  validateFindingAnnotationLinks,
} from './xCoreAnalysisReportDomain.js';
import {
  checksum,
  readStoredFile,
  removeStoredFile,
  writeCaseRender,
  writeReportPdf,
} from './xCoreAnalysisReportStorage.js';

const prisma = new PrismaClient();

function json(value) {
  return JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item));
}

function httpError(status, message, code, details = undefined) {
  return Object.assign(new Error(message), { status, code, details });
}

function asBigInt(value, field) {
  try { return BigInt(value); } catch { throw httpError(400, `${field} is invalid`, `invalid_${field}`); }
}

function normalizeCasePayload(payload = {}) {
  const normalized = {
    title: String(payload.title || 'Analisis X-Core').trim().slice(0, 255),
    clinicalData: payload.clinical_data && typeof payload.clinical_data === 'object' && !Array.isArray(payload.clinical_data)
      ? payload.clinical_data : {},
    conclusion: payload.conclusion == null ? null : String(payload.conclusion).slice(0, 20000),
    status: String(payload.status || 'DRAFT').toUpperCase(),
  };
  if (!['DRAFT', 'FINALIZED'].includes(normalized.status)) throw httpError(400, 'Case status is invalid', 'invalid_case_status');
  return normalized;
}

function normalizeItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) throw httpError(400, 'At least one image is required', 'case_items_required');
  if (items.length > 50) throw httpError(400, 'A case cannot contain more than 50 images', 'too_many_case_items');
  const normalized = items.map((item, index) => {
    const validation = validateCaseItem(item, index);
    if (validation.errors.length) throw httpError(400, `Item ${index + 1}: ${validation.errors.join(', ')}`, 'invalid_case_item');
    return {
      id: item.id || randomUUID(),
      studyId: asBigInt(item.study_id || item.studyId, 'study_id'),
      seriesId: item.series_id || item.seriesId ? asBigInt(item.series_id || item.seriesId, 'series_id') : null,
      seriesUid: String(item.series_uid || item.seriesUid).slice(0, 512),
      viewerType: String(item.viewer_type || item.viewerType || '2d').toLowerCase(),
      radiographType: validation.radiographType,
      toothNumbers: validation.toothNumbers,
      displayOrder: validation.displayOrder,
      title: item.title == null ? null : String(item.title).slice(0, 255),
      findings: item.findings == null ? null : String(item.findings).slice(0, 20000),
      structuredFindings: normalizeStructuredFindings(item.structured_findings ?? item.structuredFindings ?? []),
    };
  });
  const orders = new Set(normalized.map((item) => item.displayOrder));
  if (orders.size !== normalized.length) throw httpError(400, 'display_order values must be unique', 'duplicate_display_order');
  if (normalized.some((item) => !['2d', 'slice', '3d'].includes(item.viewerType))) throw httpError(400, 'viewer_type is invalid', 'invalid_viewer_type');
  if (normalized.some((item) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id))) {
    throw httpError(400, 'Case item id must be a UUID', 'invalid_case_item_id');
  }
  return normalized.sort((a, b) => a.displayOrder - b.displayOrder);
}

async function loadScopedAnnotations(item, client = prisma) {
  const rows = await client.$queryRaw(Prisma.sql`
    SELECT id, type, coordinates, label, color, metadata, slice_axis, slice_index,
           review_status, created_at, updated_at
    FROM study_annotations
    WHERE study_id=${asBigInt(item.study_id ?? item.studyId, 'study_id')}
      AND series_uid=${item.series_uid ?? item.seriesUid}
      AND viewer_type=${item.viewer_type ?? item.viewerType}
    ORDER BY created_at ASC, id ASC
  `);
  return json(rows);
}

function renderRecord(item, prefix) {
  const id = item[`${prefix}_render_id`];
  if (!id) return null;
  return {
    id,
    render_type: prefix === 'annotated' ? 'ANNOTATED' : 'CLEAN',
    storage_path: item[`${prefix}_storage_path`],
    checksum: item[`${prefix}_checksum`],
    width: item[`${prefix}_width`],
    height: item[`${prefix}_height`],
    mime_type: item[`${prefix}_mime_type`],
    render_metadata: item[`${prefix}_metadata`] || {},
    analysis_fingerprint: item[`${prefix}_fingerprint`],
    validation_result: item[`${prefix}_validation`] || {},
    created_at: item[`${prefix}_created_at`],
  };
}

async function attachRenderState(items, client = prisma) {
  return Promise.all(items.map(async (item) => {
    const annotations = await loadScopedAnnotations(item, client);
    const structuredFindings = normalizeStructuredFindings(item.structured_findings || []);
    const currentFingerprint = computeAnalysisFingerprint({ ...item, structured_findings: structuredFindings }, annotations);
    const annotated = renderRecord(item, 'annotated');
    const clean = renderRecord(item, 'clean');
    const linkIssues = validateFindingAnnotationLinks(structuredFindings, annotations);
    const freshness = linkIssues.length
      ? { status: 'INVALID', ready: false, message: 'Ada marker yang tidak lagi terhubung ke anotasi.', issues: linkIssues }
      : resolveRenderFreshness({
        latestAnnotated: annotated,
        latestClean: clean,
        currentFingerprint,
        legacyPath: item.render_storage_path,
      });
    return {
      ...item,
      structured_findings: structuredFindings,
      analysis_fingerprint: currentFingerprint,
      report_renders: { annotated, clean },
      render_status: freshness,
    };
  }));
}

async function loadCaseRows(caseId, client = prisma) {
  const cases = await client.$queryRaw(Prisma.sql`
    SELECT c.*, p.name AS patient_name, p.email AS patient_email,
           u.name AS creator_name, u.email AS creator_email,
           COALESCE(
             (SELECT dp.clinic_name FROM dentist_profiles dp WHERE dp.user_id=u.id ORDER BY dp.id LIMIT 1),
             (SELECT COALESCE(cp.brand_name, cp.legal_name) FROM clinic_profiles cp WHERE cp.user_id=u.id ORDER BY cp.id LIMIT 1)
           ) AS facility_name
    FROM xcore_analysis_cases c
    JOIN users p ON p.id = c.patient_id
    JOIN users u ON u.id = c.created_by
    WHERE c.id = ${caseId}::uuid
  `);
  if (!cases.length) throw httpError(404, 'Analysis case not found', 'case_not_found');
  const rawItems = await client.$queryRaw(Prisma.sql`
    SELECT i.*, s.original_name AS study_name, s.modality, s.patient_id AS study_patient_id,
           s.study_date, s.metadata AS study_metadata, se.preview_image_url, se.pixel_spacing,
           ar.id AS annotated_render_id, ar.storage_path AS annotated_storage_path,
           ar.checksum AS annotated_checksum, ar.width AS annotated_width, ar.height AS annotated_height,
           ar.mime_type AS annotated_mime_type, ar.render_metadata AS annotated_metadata,
           ar.analysis_fingerprint AS annotated_fingerprint, ar.validation_result AS annotated_validation,
           ar.created_at AS annotated_created_at,
           cr.id AS clean_render_id, cr.storage_path AS clean_storage_path,
           cr.checksum AS clean_checksum, cr.width AS clean_width, cr.height AS clean_height,
           cr.mime_type AS clean_mime_type, cr.render_metadata AS clean_metadata,
           cr.analysis_fingerprint AS clean_fingerprint, cr.validation_result AS clean_validation,
           cr.created_at AS clean_created_at
    FROM xcore_analysis_case_items i
    JOIN imaging_studies s ON s.id = i.study_id
    LEFT JOIN imaging_series se ON se.id = i.series_id
    LEFT JOIN LATERAL (
      SELECT r.* FROM xcore_analysis_case_item_renders r
      WHERE r.case_item_id=i.id AND r.render_type='ANNOTATED'
      ORDER BY r.created_at DESC, r.id DESC LIMIT 1
    ) ar ON TRUE
    LEFT JOIN LATERAL (
      SELECT r.* FROM xcore_analysis_case_item_renders r
      WHERE r.case_item_id=i.id AND r.render_type='CLEAN'
      ORDER BY r.created_at DESC, r.id DESC LIMIT 1
    ) cr ON TRUE
    WHERE i.case_id = ${caseId}::uuid
    ORDER BY i.display_order ASC
  `);
  const items = await attachRenderState(json(rawItems), client);
  const reports = await client.$queryRaw(Prisma.sql`
    SELECT id, case_id, version, status, checksum, created_by, created_at
    FROM xcore_analysis_reports WHERE case_id = ${caseId}::uuid ORDER BY version DESC
  `);
  const record = cases[0];
  return json({
    id: record.id,
    patient_id: record.patient_id,
    created_by: record.created_by,
    title: record.title,
    status: record.status,
    clinical_data: record.clinical_data || {},
    conclusion: record.conclusion,
    created_at: record.created_at,
    updated_at: record.updated_at,
    patient: { id: record.patient_id, name: record.patient_name, email: record.patient_email },
    creator: { id: record.created_by, name: record.creator_name, email: record.creator_email },
    facility_name: record.facility_name || null,
    items,
    reports,
  });
}

function requireOwner(caseRecord, userId) {
  assertCaseOwner(caseRecord.created_by, userId);
}

async function verifyStudies(items, patientId, requireStudyAccess) {
  for (const item of items) {
    const access = await requireStudyAccess(item.studyId);
    if (!access?.study) throw httpError(403, 'Study access denied', 'study_access_denied');
    if (String(access.study.patientId || '') !== String(patientId)) {
      throw httpError(400, 'Every image in a case must belong to the selected patient', 'case_patient_mismatch');
    }
    if (item.seriesId) {
      const series = await prisma.imagingSeries.findFirst({ where: { id: item.seriesId, studyId: item.studyId }, select: { id: true } });
      if (!series) throw httpError(400, 'series_id does not belong to study_id', 'series_study_mismatch');
    }
  }
}

async function verifyFindingLinks(items, client = prisma) {
  for (const item of items) {
    if (!item.structuredFindings.length) continue;
    const annotations = await loadScopedAnnotations(item, client);
    assertFindingLinks(item.structuredFindings, annotations);
  }
}

async function insertItem(tx, caseId, item) {
  const affected = await tx.$executeRaw(Prisma.sql`
    INSERT INTO xcore_analysis_case_items
      (id, case_id, study_id, series_id, series_uid, viewer_type, radiograph_type, tooth_numbers,
       display_order, title, findings, structured_findings)
    VALUES
      (${item.id}::uuid, ${caseId}::uuid, ${item.studyId}, ${item.seriesId}, ${item.seriesUid}, ${item.viewerType},
       ${item.radiographType}, ${item.toothNumbers}::varchar(3)[], ${item.displayOrder}, ${item.title},
       ${item.findings}, ${JSON.stringify(item.structuredFindings)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      study_id=EXCLUDED.study_id, series_id=EXCLUDED.series_id, series_uid=EXCLUDED.series_uid,
      viewer_type=EXCLUDED.viewer_type, radiograph_type=EXCLUDED.radiograph_type,
      tooth_numbers=EXCLUDED.tooth_numbers, display_order=EXCLUDED.display_order,
      title=EXCLUDED.title, findings=EXCLUDED.findings, structured_findings=EXCLUDED.structured_findings
    WHERE xcore_analysis_case_items.case_id=EXCLUDED.case_id
  `);
  if (affected !== 1) throw httpError(409, 'Case item id is already used by another case', 'case_item_id_conflict');
}

async function replaceCaseItems(tx, caseId, items) {
  await tx.$executeRaw(Prisma.sql`
    UPDATE xcore_analysis_case_items SET display_order=display_order + 10000 WHERE case_id=${caseId}::uuid
  `);
  for (const item of items) await insertItem(tx, caseId, item);
  const itemIds = items.map((item) => Prisma.sql`${item.id}::uuid`);
  await tx.$executeRaw(Prisma.sql`
    DELETE FROM xcore_analysis_case_items
    WHERE case_id=${caseId}::uuid AND id NOT IN (${Prisma.join(itemIds)})
  `);
}

export async function listAnalysisCases(userId) {
  const ownerId = asBigInt(userId, 'user_id');
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT c.*, p.name AS patient_name,
      (SELECT COUNT(*)::int FROM xcore_analysis_case_items i WHERE i.case_id = c.id) AS item_count,
      (SELECT COUNT(*)::int FROM xcore_analysis_reports r WHERE r.case_id = c.id) AS report_count
    FROM xcore_analysis_cases c JOIN users p ON p.id = c.patient_id
    WHERE c.created_by = ${ownerId} ORDER BY c.updated_at DESC
  `);
  return json(rows);
}

export async function getAnalysisCase(caseId, userId) {
  const record = await loadCaseRows(caseId);
  requireOwner(record, userId);
  return record;
}

export async function createAnalysisCase({ userId, patientId, payload, requireStudyAccess }) {
  const creatorId = asBigInt(userId, 'user_id');
  const parsedPatientId = asBigInt(patientId || payload.patient_id, 'patient_id');
  const data = normalizeCasePayload(payload);
  const items = normalizeItems(payload.items);
  await verifyStudies(items, parsedPatientId, requireStudyAccess);
  await verifyFindingLinks(items);
  const caseId = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO xcore_analysis_cases (id, patient_id, created_by, title, status, clinical_data, conclusion)
      VALUES (${caseId}::uuid, ${parsedPatientId}, ${creatorId}, ${data.title}, ${data.status}, ${JSON.stringify(data.clinicalData)}::jsonb, ${data.conclusion})
    `);
    for (const item of items) await insertItem(tx, caseId, item);
  });
  return loadCaseRows(caseId);
}

export async function updateAnalysisCase({ caseId, userId, payload, requireStudyAccess }) {
  const current = await loadCaseRows(caseId);
  requireOwner(current, userId);
  const data = normalizeCasePayload({ ...current, ...payload });
  const items = normalizeItems(payload.items || current.items);
  if (current.status === 'FINALIZED' && payload.items) throw httpError(409, 'Finalized case images cannot be changed', 'case_finalized');
  await verifyStudies(items, current.patient_id, requireStudyAccess);
  await verifyFindingLinks(items);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      UPDATE xcore_analysis_cases SET title=${data.title}, status=${data.status},
        clinical_data=${JSON.stringify(data.clinicalData)}::jsonb, conclusion=${data.conclusion}
      WHERE id=${caseId}::uuid
    `);
    await replaceCaseItems(tx, caseId, items);
  });
  return loadCaseRows(caseId);
}

function normalizeRenderPayload({ renders, dataUrl }) {
  if (renders && typeof renders === 'object' && !Array.isArray(renders)) return renders;
  if (dataUrl) return { ANNOTATED: { data_url: dataUrl, legacy: true } };
  throw httpError(400, 'Render CLEAN dan/atau ANNOTATED wajib dikirim.', 'case_render_required');
}

export async function saveAnalysisCaseRender({ caseId, itemId, userId, renders, dataUrl }) {
  const record = await loadCaseRows(caseId);
  requireOwner(record, userId);
  const item = record.items.find((candidate) => candidate.id === itemId);
  if (!item) throw httpError(404, 'Case image not found', 'case_item_not_found');
  const payload = normalizeRenderPayload({ renders, dataUrl });
  const annotations = await loadScopedAnnotations(item);
  const findings = normalizeStructuredFindings(item.structured_findings || []);
  assertFindingLinks(findings, annotations);
  const fingerprint = computeAnalysisFingerprint(item, annotations);
  const savedRenders = [];

  for (const renderType of REPORT_RENDER_TYPES) {
    const input = payload[renderType] || payload[renderType.toLowerCase()];
    if (!input) continue;
    if (input.legacy) {
      const saved = await writeCaseRender({ caseId, itemId, renderType, dataUrl: input.data_url });
      await prisma.$executeRaw(Prisma.sql`
        UPDATE xcore_analysis_case_items SET render_storage_path=${saved.storagePath}, render_checksum=${saved.checksum}
        WHERE id=${itemId}::uuid AND case_id=${caseId}::uuid
      `);
      return { legacy: true, render_storage_path: saved.storagePath, render_checksum: saved.checksum };
    }
    const metadata = normalizeRenderMetadata(input.metadata, { item, renderType });
    const saved = await writeCaseRender({ caseId, itemId, renderType, dataUrl: input.data_url ?? input.dataUrl });
    metadata.render_width = saved.width;
    metadata.render_height = saved.height;
    metadata.analysis_fingerprint = fingerprint;
    savedRenders.push({ ...saved, metadata });
  }
  if (!savedRenders.length) throw httpError(400, 'Tidak ada render yang dapat disimpan.', 'case_render_required');

  await prisma.$transaction(async (tx) => {
    for (const saved of savedRenders) {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO xcore_analysis_case_item_renders
          (id, case_item_id, render_type, storage_path, checksum, width, height, mime_type,
           render_metadata, analysis_fingerprint, validation_result, created_by)
        VALUES (${randomUUID()}::uuid, ${itemId}::uuid, ${saved.renderType}, ${saved.storagePath}, ${saved.checksum},
          ${saved.width}, ${saved.height}, ${saved.mimeType}, ${JSON.stringify(saved.metadata)}::jsonb,
          ${fingerprint}, ${JSON.stringify(saved.validation)}::jsonb, ${asBigInt(userId, 'user_id')})
        ON CONFLICT (case_item_id, render_type, checksum, analysis_fingerprint) DO NOTHING
      `);
      if (saved.renderType === 'ANNOTATED') {
        await tx.$executeRaw(Prisma.sql`
          UPDATE xcore_analysis_case_items SET render_storage_path=${saved.storagePath}, render_checksum=${saved.checksum}
          WHERE id=${itemId}::uuid AND case_id=${caseId}::uuid
        `);
      }
    }
  });
  return {
    analysis_fingerprint: fingerprint,
    renders: Object.fromEntries(savedRenders.map((saved) => [saved.renderType, {
      render_type: saved.renderType,
      storage_path: saved.storagePath,
      checksum: saved.checksum,
      width: saved.width,
      height: saved.height,
      metadata: saved.metadata,
      validation: saved.validation,
    }])),
    status: 'READY',
  };
}

function buildPreflight(record) {
  const issues = record.items.flatMap((item) => {
    if (item.render_status?.ready) return [];
    return [{
      item_id: item.id,
      display_order: item.display_order,
      radiograph_type: item.radiograph_type,
      code: `render_${String(item.render_status?.status || 'missing').toLowerCase()}`,
      status: item.render_status?.status || 'MISSING',
      message: item.render_status?.message || 'Gambar laporan belum siap.',
      details: item.render_status?.issues || [],
    }];
  });
  return { ready: record.items.length > 0 && issues.length === 0, item_count: record.items.length, issues };
}

export async function preflightAnalysisReport({ caseId, userId }) {
  const record = await loadCaseRows(caseId);
  requireOwner(record, userId);
  return buildPreflight(record);
}

export async function generateAnalysisReport({ caseId, userId, status = 'DRAFT' }) {
  const record = await loadCaseRows(caseId);
  requireOwner(record, userId);
  if (!record.items.length) throw httpError(400, 'Case has no images', 'case_items_required');
  const preflight = buildPreflight(record);
  if (!preflight.ready) {
    throw httpError(409, 'PDF belum dapat dibuat. Perbarui gambar laporan pada item yang ditandai.', 'report_preflight_failed', preflight);
  }

  const normalizedStatus = String(status).toUpperCase();
  if (!['DRAFT', 'FINAL'].includes(normalizedStatus)) throw httpError(400, 'Report status is invalid', 'invalid_report_status');
  const reportId = randomUUID();
  const snapshotItems = [];
  const imageBuffers = new Map();
  for (const item of record.items) {
    const annotations = await loadScopedAnnotations(item);
    const measurements = annotations.filter((entry) => entry.type === 'measurement' || entry.metadata?.clinical_record_type === 'measurement');
    const annotated = item.report_renders.annotated;
    const clean = item.report_renders.clean;
    const currentFingerprint = computeAnalysisFingerprint(item, annotations);
    if (annotated.analysis_fingerprint !== currentFingerprint) {
      throw httpError(409, `Gambar laporan citra ${item.display_order + 1} berubah setelah preflight.`, 'report_render_stale', {
        item_id: item.id,
      });
    }
    const imageBuffer = await readStoredFile(annotated.storage_path);
    if (checksum(imageBuffer) !== annotated.checksum) {
      throw httpError(409, `File gambar laporan citra ${item.display_order + 1} tidak lolos verifikasi checksum.`, 'report_render_corrupt', {
        item_id: item.id,
      });
    }
    imageBuffers.set(item.id, imageBuffer);
    snapshotItems.push({
      ...item,
      annotations,
      measurements: [...new Map(measurements.map((entry) => [entry.id, entry])).values()],
      structured_findings: normalizeStructuredFindings(item.structured_findings || []),
      render_storage_path: annotated.storage_path,
      render_checksum: annotated.checksum,
      render_metadata: annotated.render_metadata,
      clean_render_storage_path: clean?.storage_path || null,
      clean_render_checksum: clean?.checksum || null,
    });
  }

  let pendingStoragePath = null;
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${caseId}, 0))`);
      const versionRows = await tx.$queryRaw(Prisma.sql`
        SELECT COALESCE(MAX(version), 0)::int + 1 AS version
        FROM xcore_analysis_reports WHERE case_id=${caseId}::uuid
      `);
      const version = versionRows[0].version;
      const generatedAt = new Date().toISOString();
      const snapshot = {
        id: record.id,
        patient_id: record.patient_id,
        created_by: record.created_by,
        title: record.title,
        clinical_data: record.clinical_data,
        conclusion: record.conclusion,
        patient: record.patient,
        creator: record.creator,
        facility_name: record.facility_name,
        items: snapshotItems,
        report_id: reportId,
        report_version: version,
        report_status: normalizedStatus,
        generated_at: generatedAt,
        snapshot_schema: 'xcore-analysis-report-v2',
      };
      snapshot.snapshot_checksum = checksum(Buffer.from(stableJson(snapshot)));
      const { items: _relationalReportItems, ...caseHeaderSnapshot } = snapshot;
      const pdf = await buildXCoreAnalysisPdf({ snapshot, imageBuffers });
      const stored = await writeReportPdf({ caseId, reportId, version, buffer: pdf });
      pendingStoragePath = stored.storagePath;
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO xcore_analysis_reports (id, case_id, version, status, created_by, storage_path, checksum, case_snapshot)
        VALUES (${reportId}::uuid, ${caseId}::uuid, ${version}, ${normalizedStatus}, ${asBigInt(userId, 'user_id')},
          ${stored.storagePath}, ${stored.checksum}, ${JSON.stringify(caseHeaderSnapshot)}::jsonb)
      `);
      for (const item of snapshotItems) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO xcore_analysis_report_items
            (id, report_id, source_case_item_id, display_order, radiograph_type, tooth_numbers, title, findings,
             structured_findings, study_id, series_uid, viewer_type, annotation_snapshot, measurement_snapshot,
             render_storage_path, render_checksum, render_metadata, clean_render_storage_path, clean_render_checksum)
          VALUES (${randomUUID()}::uuid, ${reportId}::uuid, ${item.id}::uuid, ${item.display_order}, ${item.radiograph_type},
            ${item.tooth_numbers}::varchar(3)[], ${item.title}, ${item.findings}, ${JSON.stringify(item.structured_findings)}::jsonb,
            ${asBigInt(item.study_id, 'study_id')}, ${item.series_uid}, ${item.viewer_type},
            ${JSON.stringify(item.annotations)}::jsonb, ${JSON.stringify(item.measurements)}::jsonb,
            ${item.render_storage_path}, ${item.render_checksum}, ${JSON.stringify(item.render_metadata)}::jsonb,
            ${item.clean_render_storage_path}, ${item.clean_render_checksum})
        `);
      }
      return json({
        id: reportId,
        case_id: caseId,
        version,
        status: normalizedStatus,
        checksum: stored.checksum,
        created_at: generatedAt,
      });
    }, { timeout: 30_000 });
    pendingStoragePath = null;
    return result;
  } catch (error) {
    if (pendingStoragePath) await removeStoredFile(pendingStoragePath).catch(() => {});
    if (error?.code === 'P2002' || error?.code === '23505') {
      throw httpError(409, 'Versi laporan dibuat bersamaan oleh proses lain. Silakan ulangi.', 'report_version_conflict');
    }
    throw error;
  }
}

export async function getAnalysisReportFile({ caseId, reportId, userId }) {
  const record = await loadCaseRows(caseId);
  requireOwner(record, userId);
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT id, version, storage_path, checksum FROM xcore_analysis_reports
    WHERE id=${reportId}::uuid AND case_id=${caseId}::uuid
  `);
  if (!rows.length) throw httpError(404, 'Report not found', 'report_not_found');
  return { ...json(rows[0]), buffer: await readStoredFile(rows[0].storage_path) };
}
