import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { buildXCoreAnalysisPdf } from './xCoreAnalysisPdf.js';
import { assertCaseOwner, validateCaseItem } from './xCoreAnalysisCaseDomain.js';
import { readStoredFile, writeCaseRender, writeReportPdf } from './xCoreAnalysisReportStorage.js';

const prisma = new PrismaClient();

function json(value) {
  return JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item));
}

function httpError(status, message, code) {
  return Object.assign(new Error(message), { status, code });
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
      renderStoragePath: null,
      renderChecksum: null,
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

async function loadCaseRows(caseId, client = prisma) {
  const cases = await client.$queryRaw(Prisma.sql`
    SELECT c.*, p.name AS patient_name, p.email AS patient_email, u.name AS creator_name, u.email AS creator_email
    FROM xcore_analysis_cases c
    JOIN users p ON p.id = c.patient_id
    JOIN users u ON u.id = c.created_by
    WHERE c.id = ${caseId}::uuid
  `);
  if (!cases.length) throw httpError(404, 'Analysis case not found', 'case_not_found');
  const items = await client.$queryRaw(Prisma.sql`
    SELECT i.*, s.original_name AS study_name, s.modality, s.patient_id AS study_patient_id,
           se.preview_image_url
    FROM xcore_analysis_case_items i
    JOIN imaging_studies s ON s.id = i.study_id
    LEFT JOIN imaging_series se ON se.id = i.series_id
    WHERE i.case_id = ${caseId}::uuid
    ORDER BY i.display_order ASC
  `);
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

async function insertItems(tx, caseId, items) {
  for (const item of items) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO xcore_analysis_case_items
        (id, case_id, study_id, series_id, series_uid, viewer_type, radiograph_type, tooth_numbers, display_order, title, findings, render_storage_path, render_checksum)
      VALUES
        (${item.id}::uuid, ${caseId}::uuid, ${item.studyId}, ${item.seriesId}, ${item.seriesUid}, ${item.viewerType}, ${item.radiographType},
         ${item.toothNumbers}::varchar(3)[], ${item.displayOrder}, ${item.title}, ${item.findings}, ${item.renderStoragePath}, ${item.renderChecksum})
    `);
  }
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
  const caseId = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO xcore_analysis_cases (id, patient_id, created_by, title, status, clinical_data, conclusion)
      VALUES (${caseId}::uuid, ${parsedPatientId}, ${creatorId}, ${data.title}, ${data.status}, ${JSON.stringify(data.clinicalData)}::jsonb, ${data.conclusion})
    `);
    await insertItems(tx, caseId, items);
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
  const oldRenderById = new Map(current.items.map((item) => [item.id, item]));
  items.forEach((item) => {
    const old = oldRenderById.get(item.id);
    if (old && !item.renderStoragePath) {
      item.renderStoragePath = old.render_storage_path;
      item.renderChecksum = old.render_checksum;
    }
  });
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      UPDATE xcore_analysis_cases SET title=${data.title}, status=${data.status}, clinical_data=${JSON.stringify(data.clinicalData)}::jsonb,
        conclusion=${data.conclusion} WHERE id=${caseId}::uuid
    `);
    await tx.$executeRaw(Prisma.sql`DELETE FROM xcore_analysis_case_items WHERE case_id=${caseId}::uuid`);
    await insertItems(tx, caseId, items);
  });
  return loadCaseRows(caseId);
}

export async function saveAnalysisCaseRender({ caseId, itemId, userId, dataUrl }) {
  const record = await loadCaseRows(caseId);
  requireOwner(record, userId);
  const item = record.items.find((candidate) => candidate.id === itemId);
  if (!item) throw httpError(404, 'Case image not found', 'case_item_not_found');
  const saved = await writeCaseRender({ caseId, itemId, dataUrl });
  await prisma.$executeRaw(Prisma.sql`
    UPDATE xcore_analysis_case_items SET render_storage_path=${saved.storagePath}, render_checksum=${saved.checksum}
    WHERE id=${itemId}::uuid AND case_id=${caseId}::uuid
  `);
  return { render_storage_path: saved.storagePath, render_checksum: saved.checksum };
}

export async function generateAnalysisReport({ caseId, userId, status = 'DRAFT' }) {
  const record = await loadCaseRows(caseId);
  requireOwner(record, userId);
  if (!record.items.length) throw httpError(400, 'Case has no images', 'case_items_required');
  const missing = record.items.filter((item) => !item.render_storage_path);
  if (missing.length) throw httpError(409, `Capture the annotated render for ${missing.length} image(s) before generating the report`, 'case_render_missing');

  const normalizedStatus = String(status).toUpperCase();
  if (!['DRAFT', 'FINAL'].includes(normalizedStatus)) throw httpError(400, 'Report status is invalid', 'invalid_report_status');
  const reportId = randomUUID();
  const versionRows = await prisma.$queryRaw(Prisma.sql`SELECT COALESCE(MAX(version), 0)::int + 1 AS version FROM xcore_analysis_reports WHERE case_id=${caseId}::uuid`);
  const version = versionRows[0].version;
  const snapshotItems = [];
  const imageBuffers = new Map();
  for (const item of record.items) {
    const annotations = await prisma.$queryRaw(Prisma.sql`
      SELECT id, type, coordinates, label, color, metadata, slice_axis, slice_index, review_status, created_at, updated_at
      FROM study_annotations WHERE study_id=${asBigInt(item.study_id, 'study_id')} AND series_uid=${item.series_uid} AND viewer_type=${item.viewer_type}
      ORDER BY created_at ASC
    `);
    const serialized = json(annotations);
    const measurements = serialized.filter((entry) => entry.type === 'measurement' || entry.metadata?.clinical_record_type === 'measurement');
    const renderBuffer = await readStoredFile(item.render_storage_path);
    imageBuffers.set(item.id, renderBuffer);
    snapshotItems.push({ ...item, annotations: serialized, measurements });
  }
  const generatedAt = new Date().toISOString();
  const snapshot = {
    id: record.id, patient_id: record.patient_id, created_by: record.created_by, title: record.title,
    clinical_data: record.clinical_data, conclusion: record.conclusion, patient: record.patient, creator: record.creator,
    items: snapshotItems, report_id: reportId, report_version: version, report_status: normalizedStatus, generated_at: generatedAt,
  };
  const { items: _relationalReportItems, ...caseHeaderSnapshot } = snapshot;
  const pdf = await buildXCoreAnalysisPdf({ snapshot, imageBuffers });
  const stored = await writeReportPdf({ caseId, reportId, version, buffer: pdf });
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO xcore_analysis_reports (id, case_id, version, status, created_by, storage_path, checksum, case_snapshot)
      VALUES (${reportId}::uuid, ${caseId}::uuid, ${version}, ${normalizedStatus}, ${asBigInt(userId, 'user_id')}, ${stored.storagePath}, ${stored.checksum}, ${JSON.stringify(caseHeaderSnapshot)}::jsonb)
    `);
    for (const item of snapshotItems) {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO xcore_analysis_report_items
          (id, report_id, source_case_item_id, display_order, radiograph_type, tooth_numbers, title, findings, study_id, series_uid, viewer_type,
           annotation_snapshot, measurement_snapshot, render_storage_path, render_checksum)
        VALUES (${randomUUID()}::uuid, ${reportId}::uuid, ${item.id}::uuid, ${item.display_order}, ${item.radiograph_type}, ${item.tooth_numbers}::varchar(3)[],
          ${item.title}, ${item.findings}, ${asBigInt(item.study_id, 'study_id')}, ${item.series_uid}, ${item.viewer_type},
          ${JSON.stringify(item.annotations)}::jsonb, ${JSON.stringify(item.measurements)}::jsonb, ${item.render_storage_path}, ${item.render_checksum})
      `);
    }
  });
  return json({ id: reportId, case_id: caseId, version, status: normalizedStatus, checksum: stored.checksum, created_at: generatedAt });
}

export async function getAnalysisReportFile({ caseId, reportId, userId }) {
  const record = await loadCaseRows(caseId);
  requireOwner(record, userId);
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT id, version, storage_path, checksum FROM xcore_analysis_reports WHERE id=${reportId}::uuid AND case_id=${caseId}::uuid
  `);
  if (!rows.length) throw httpError(404, 'Report not found', 'report_not_found');
  return { ...json(rows[0]), buffer: await readStoredFile(rows[0].storage_path) };
}
