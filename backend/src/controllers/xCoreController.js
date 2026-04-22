import { Prisma, PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { validateAnnotationPayload } from '../utils/xCoreAnnotationValidation.js';

const prisma = new PrismaClient();
const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '../../uploads/x-core');
const PY_SERVICE_BASE_URL = process.env.XCORE_PY_API_BASE_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';
const ALLOWED_SHARE_EXPIRY_HOURS = new Set([24, 48, 72, 168]);
const ANNOTATION_TYPES = new Set(['arrow', 'circle', 'text', 'freehand', 'region']);
const REVIEW_STATUSES = new Set(['draft', 'submitted', 'approved', 'rejected']);

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function serializeJson(payload) {
    return JSON.parse(JSON.stringify(payload, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}

function buildPublicAppBaseUrl(req) {
    const configured =
        process.env.XCORE_SHARE_BASE_URL ||
        process.env.APP_BASE_URL ||
        process.env.FRONTEND_BASE_URL;

    if (configured) {
        return configured.replace(/\/$/, '');
    }

    const forwardedProto = req.headers['x-forwarded-proto'];
    const forwardedHost = req.headers['x-forwarded-host'];
    const protocol = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)?.split(',')[0]
        || req.protocol
        || 'http';
    const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.get('host');
    return `${protocol}://${host}`;
}

function cleanPatientName(name, fallback = 'Patient') {
    if (!name || typeof name !== 'string') return fallback;
    const normalized = name.replace(/\^/g, ' ').trim();
    return normalized || fallback;
}

function parseBigIntId(value) {
    try {
        return BigInt(value);
    } catch {
        return null;
    }
}

function normalizeReviewStatus(value, fallback = 'draft') {
    const normalized = String(value || fallback).toLowerCase();
    return REVIEW_STATUSES.has(normalized) ? normalized : fallback;
}

function confidenceForStatus(status, explicitValue) {
    const parsed = Number(explicitValue);
    if (Number.isFinite(parsed)) {
        return Math.max(0, Math.min(1, parsed));
    }

    if (status === 'approved') return 1.0;
    if (status === 'rejected') return 0.0;
    return 0.7;
}

function normalizeAnnotationInput(annotation, defaults = {}) {
    const viewerType = String(annotation.viewer_type || annotation.viewerType || defaults.viewer_type || defaults.viewerType || '').toLowerCase();
    const type = String(annotation.annotation_type || annotation.type || '').toLowerCase();
    const seriesUid = String(annotation.series_uid || annotation.seriesUid || defaults.series_uid || defaults.seriesUid || '');
    const sliceAxis = annotation.slice_axis ?? annotation.sliceAxis ?? defaults.slice_axis ?? defaults.sliceAxis ?? null;
    const sliceIndexValue = annotation.slice_index ?? annotation.sliceIndex ?? defaults.slice_index ?? defaults.sliceIndex ?? null;
    const sliceIndex = sliceIndexValue === null || sliceIndexValue === undefined || sliceIndexValue === ''
        ? null
        : Number(sliceIndexValue);
    const reviewStatus = normalizeReviewStatus(annotation.review_status || annotation.reviewStatus);
    const reviewedBy = annotation.reviewed_by || annotation.reviewedBy
        ? parseBigIntId(annotation.reviewed_by || annotation.reviewedBy)
        : null;
    const reviewedAt = annotation.reviewed_at || annotation.reviewedAt
        ? new Date(annotation.reviewed_at || annotation.reviewedAt)
        : null;
    const metadata = annotation.metadata && typeof annotation.metadata === 'object' ? { ...annotation.metadata } : {};
    if (type !== 'text') {
        metadata.finding_type = metadata.finding_type || 'other';
        metadata.severity = metadata.severity || 'S1';
    }

    return {
        id: annotation.id && String(annotation.id).length <= 120 ? String(annotation.id) : randomUUID(),
        seriesUid,
        viewerType,
        sliceAxis: sliceAxis ? String(sliceAxis) : null,
        sliceIndex: Number.isInteger(sliceIndex) ? sliceIndex : null,
        type,
        coordinates: annotation.coordinates && typeof annotation.coordinates === 'object' ? annotation.coordinates : {},
        label: annotation.label ? String(annotation.label).slice(0, 1000) : null,
        color: annotation.color ? String(annotation.color).slice(0, 32) : null,
        metadata,
        reviewStatus,
        reviewedBy,
        reviewedAt,
        reviewerComment: annotation.reviewer_comment || annotation.reviewerComment
            ? String(annotation.reviewer_comment || annotation.reviewerComment).slice(0, 1000)
            : null,
        confidenceScore: confidenceForStatus(reviewStatus, annotation.confidence_score ?? annotation.confidenceScore),
        createdAt: annotation.created_at || annotation.createdAt ? new Date(annotation.created_at || annotation.createdAt) : new Date(),
        updatedAt: annotation.updated_at || annotation.updatedAt ? new Date(annotation.updated_at || annotation.updatedAt) : null,
    };
}

function serializeAnnotationRow(row) {
    return serializeJson({
        id: row.id,
        series_uid: row.series_uid,
        viewer_type: row.viewer_type,
        slice_axis: row.slice_axis,
        slice_index: row.slice_index,
        annotation_type: row.type,
        type: row.type,
        coordinates: row.coordinates || {},
        label: row.label,
        color: row.color,
        metadata: row.metadata || {},
        review_status: row.review_status || 'draft',
        reviewed_by: row.reviewed_by,
        reviewed_at: row.reviewed_at,
        reviewer_comment: row.reviewer_comment,
        confidence_score: row.confidence_score ?? 0.7,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
    });
}

function serializeSnapshotRow(row) {
    return serializeJson({
        id: row.id,
        study_id: row.study_id,
        series_uid: row.series_uid,
        snapshot_at: row.snapshot_at,
        created_by: row.created_by,
        note: row.note,
        annotations: row.annotations || [],
        feature_state: row.feature_state || {},
    });
}

async function requireOwnedStudy(studyId, userId) {
    const study = await prisma.imagingStudy.findUnique({
        where: { id: studyId },
        select: { id: true, dentistId: true },
    });

    if (!study) {
        return { error: { status: 404, message: 'Study not found' } };
    }

    if (study.dentistId !== userId) {
        return { error: { status: 403, message: 'You do not have permission to access this study' } };
    }

    return { study };
}

function sanitizeSeriesPayload(series) {
    return {
        series_uid: series.series_uid,
        title: series.title || 'Unknown Series',
        type: series.type || '3D Volume',
        classification: series.classification || (series.type === '2D Image' ? '2D' : '3D'),
        modality: series.modality || 'CT',
        num_slices: Number(series.num_slices || 0),
        status: series.status || 'ready',
        has_vti: Boolean(series.has_vti),
        has_image: Boolean(series.has_image),
        has_thumb: Boolean(series.has_thumb),
        has_labels: Boolean(series.has_labels),
        num_labels: Number(series.num_labels || 0),
        segmentation_method: series.segmentation_method || null,
        segmentation_status: series.segmentation_status || (series.has_labels ? 'ready' : 'missing'),
    };
}

async function fetchStudySeriesForShare(folderName) {
    const response = await fetch(`${PY_SERVICE_BASE_URL}/gallery/${encodeURIComponent(folderName)}`);
    if (!response.ok) {
        throw new Error(`Imaging service returned ${response.status} while loading shared series`);
    }

    const payload = await response.json();
    return (payload.series || []).map(sanitizeSeriesPayload);
}

function getShareSecret() {
    if (!process.env.SHARE_SECRET) {
        throw new Error('SHARE_SECRET is not configured');
    }
    return process.env.SHARE_SECRET;
}

async function resolveStudyShareRecord(token, options = {}) {
    const { includeStudy = false } = options;
    let decoded;

    try {
        decoded = jwt.verify(token, getShareSecret());
    } catch (error) {
        if (error?.name === 'TokenExpiredError') {
            return { error: 'expired', detail: 'Share link expired' };
        }
        return { error: 'invalid', detail: 'Invalid share token' };
    }

    const shareRecord = await prisma.studyShare.findUnique({
        where: { token },
        include: includeStudy ? {
            study: {
                include: {
                    patient: { select: { name: true } },
                },
            },
        } : undefined,
    });

    if (!shareRecord) {
        return { error: 'missing', detail: 'Share link not found' };
    }

    if (shareRecord.expiresAt <= new Date()) {
        return { error: 'expired', detail: 'Share link expired', shareRecord };
    }

    if (String(decoded.studyId) !== String(shareRecord.studyId)) {
        return { error: 'invalid', detail: 'Share token study mismatch' };
    }

    if (!decoded.folderId || (shareRecord.study?.folderName && String(decoded.folderId) !== String(shareRecord.study.folderName))) {
        return { error: 'invalid', detail: 'Share token folder mismatch' };
    }

    return { decoded, shareRecord };
}

/**
 * Recursively calculate the size of a directory in bytes.
 * Returns 0n if the directory doesn't exist.
 */
function getDirSizeBytes(dirPath) {
    if (!fs.existsSync(dirPath)) return 0n;
    let total = 0n;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            total += getDirSizeBytes(fullPath);
        } else {
            try {
                total += BigInt(fs.statSync(fullPath).size);
            } catch { /* skip inaccessible files */ }
        }
    }
    return total;
}

export const uploadStudy = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const patientId = req.body.patientId ? BigInt(req.body.patientId) : null;

        // 0. Calculate Upload Size
        const uploadSize = req.files.reduce((acc, file) => acc + BigInt(file.size), 0n);

        // 1. Check Storage Quota (if user is authenticated)
        let dentistProfile = null;
        let userId = null;

        if (req.user) {
            userId = BigInt(req.user.id);
            console.log(`[X-Core] Uploading for user: ${userId}`);
            console.log(`[X-Core] Received originalFolderName: ${req.body.originalFolderName}`);

            dentistProfile = await prisma.dentistProfile.findFirst({
                where: { userId: userId }
            });

            console.log(`[X-Core] Dentist Profile found: ${!!dentistProfile}`);
            if (dentistProfile) {
                console.log(`[X-Core] Current Usage: ${dentistProfile.storage_usage}, Limit: ${dentistProfile.storage_limit}`);
            }

            if (dentistProfile) {
                const currentUsage = dentistProfile.storage_usage || 0n;
                const limit = dentistProfile.storage_limit || 10737418240n; // 10GB default

                if (currentUsage + uploadSize > limit) {
                    // Delete temp files if reject
                    for (const file of req.files) {
                        fs.unlinkSync(file.path);
                    }
                    return res.status(403).json({
                        error: 'Storage quota exceeded',
                        details: `Upload size: ${(Number(uploadSize) / (1024 * 1024)).toFixed(2)}MB. Remaining: ${(Number(limit - currentUsage) / (1024 * 1024)).toFixed(2)}MB`
                    });
                }
            }
        }

        // Create a unique folder for this upload batch
        const batchId = Date.now().toString();
        const studyDir = path.join(UPLOAD_DIR, batchId);
        fs.mkdirSync(studyDir);

        // Move files to study folder
        for (const file of req.files) {
            const targetPath = path.join(studyDir, file.originalname);
            fs.renameSync(file.path, targetPath);
        }

        // Run Python Parser
        const scriptPath = path.join(__dirname, '../../scripts/parse_dental_study.py');
        const { stdout, stderr } = await execAsync(`python3 "${scriptPath}" "${studyDir}"`);

        if (stderr && !stderr.includes('user warning')) {
            console.error('Parser Warning:', stderr);
        }

        let parseResult;
        try {
            parseResult = JSON.parse(stdout);
        } catch (e) {
            console.error('JSON Parse Error:', e, stdout);
            return res.status(500).json({ error: 'Failed to parse study metadata', details: stdout });
        }

        if (parseResult.error) {
            return res.status(400).json({ error: parseResult.error });
        }

        // Create Database Records
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Study
            const study = await tx.imagingStudy.create({
                data: {
                    patientId: patientId || 1n, // Fallback to ID 1 for demo
                    studyDate: parseResult.metadata.Date ? new Date(parseResult.metadata.Date) : new Date(),
                    modality: parseResult.modality,
                    folderName: batchId,
                    originalName: req.body.originalFolderName || batchId,
                    status: 'processed',
                    metadata: parseResult.metadata,
                    sizeInBytes: uploadSize,
                    dentistId: req.user ? BigInt(req.user.id) : undefined
                }
            });

            // 2. Create Series
            for (const s of parseResult.series) {
                await tx.imagingSeries.create({
                    data: {
                        studyId: study.id,
                        modality: s.modality,
                        sliceThickness: parseFloat(s.sliceThickness) || 1.0,
                        pixelSpacing: s.pixelSpacing,
                        kv: s.kv ? parseFloat(s.kv) : null,
                        ma: s.ma ? parseFloat(s.ma) : null,
                        numSlices: s.numSlices,
                        folderPath: studyDir
                    }
                });
            }

            // 3. Update Storage Usage
            if (dentistProfile) {
                await tx.dentistProfile.update({
                    where: { id: dentistProfile.id },
                    data: {
                        storage_usage: { increment: uploadSize }
                    }
                });
            }

            return study;
        });

        // Handle BigInt serialization
        const response = serializeJson(result);

        // Trigger background VTI conversion (fire-and-forget)
        // This pre-computes the 3D .vti file so it's ready when user opens the viewer
        try {
            fetch(`${PY_SERVICE_BASE_URL}/convert/${batchId}`, { method: 'POST' })
                .then(r => r.json())
                .then(data => console.log(`[X-Core] VTI conversion triggered: ${JSON.stringify(data)}`))
                .catch(err => console.warn(`[X-Core] VTI conversion trigger failed (non-critical): ${err.message}`));
        } catch (e) {
            console.warn('[X-Core] Could not trigger VTI conversion:', e.message);
        }

        res.json(response);

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getStudies = async (req, res) => {
    try {
        const userId = BigInt(req.user.id);
        console.log(`[X-Core] Fetching studies for user: ${userId}`);

        const studies = await prisma.imagingStudy.findMany({
            where: {
                dentistId: userId
            },
            include: {
                patient: { select: { name: true, phone_number: true } },
                series: true
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`[X-Core] Found ${studies.length} studies for user ${userId}`);

        res.json(serializeJson(studies));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getStudyAnnotations = async (req, res) => {
    try {
        const studyId = parseBigIntId(req.params.id);
        const userId = parseBigIntId(req.user?.id);
        if (!studyId || !userId) {
            return res.status(400).json({ error: 'Invalid study id' });
        }

        const ownership = await requireOwnedStudy(studyId, userId);
        if (ownership.error) {
            return res.status(ownership.error.status).json({ error: ownership.error.message });
        }

        const filters = [Prisma.sql`study_id = ${studyId}`];
        if (req.query.series_uid) {
            filters.push(Prisma.sql`series_uid = ${String(req.query.series_uid)}`);
        }
        if (req.query.viewer_type) {
            filters.push(Prisma.sql`viewer_type = ${String(req.query.viewer_type).toLowerCase()}`);
        }
        if (req.query.slice_axis) {
            filters.push(Prisma.sql`slice_axis = ${String(req.query.slice_axis)}`);
        }
        if (req.query.tooth) {
            filters.push(Prisma.sql`metadata->>'tooth_number' = ${String(req.query.tooth)}`);
        }
        if (req.query.review_status) {
            filters.push(Prisma.sql`review_status = ${normalizeReviewStatus(req.query.review_status)}`);
        }

        const rows = await prisma.$queryRaw(Prisma.sql`
            SELECT
              id,
              series_uid,
              viewer_type,
              slice_axis,
              slice_index,
              type,
              coordinates,
              label,
              color,
              metadata,
              review_status,
              reviewed_by,
              reviewed_at,
              reviewer_comment,
              confidence_score,
              created_by,
              created_at,
              updated_at
            FROM study_annotations
            WHERE ${Prisma.join(filters, ' AND ')}
            ORDER BY created_at ASC
        `);

        res.json({ annotations: rows.map(serializeAnnotationRow) });
    } catch (error) {
        console.error('Get Study Annotations Error:', error);
        res.status(500).json({ error: 'Failed to load annotations' });
    }
};

export const saveStudyAnnotations = async (req, res) => {
    try {
        const studyId = parseBigIntId(req.params.id);
        const userId = parseBigIntId(req.user?.id);
        if (!studyId || !userId) {
            return res.status(400).json({ error: 'Invalid study id' });
        }

        const ownership = await requireOwnedStudy(studyId, userId);
        if (ownership.error) {
            return res.status(ownership.error.status).json({ error: ownership.error.message });
        }

        const annotationsPayload = Array.isArray(req.body) ? req.body : req.body?.annotations;
        if (!Array.isArray(annotationsPayload)) {
            return res.status(400).json({ error: 'Body must be an annotation array or { annotations: [] }' });
        }

        const defaults = Array.isArray(req.body) ? req.query : { ...req.query, ...req.body };
        const scopeSeriesUid = String(defaults.series_uid || defaults.seriesUid || annotationsPayload[0]?.series_uid || annotationsPayload[0]?.seriesUid || '');
        const scopeViewerType = String(defaults.viewer_type || defaults.viewerType || annotationsPayload[0]?.viewer_type || annotationsPayload[0]?.viewerType || '').toLowerCase();

        if (!scopeSeriesUid || !scopeViewerType) {
            return res.status(400).json({ error: 'series_uid and viewer_type are required for annotation save scope' });
        }

        if (!['2d', 'slice', '3d'].includes(scopeViewerType)) {
            return res.status(400).json({ error: 'viewer_type must be one of 2d, slice, or 3d' });
        }

        const normalized = annotationsPayload
            .map((annotation) => normalizeAnnotationInput(annotation, {
                series_uid: scopeSeriesUid,
                viewer_type: scopeViewerType,
            }));
        const validationErrors = normalized
            .map((annotation) => ({
                id: annotation.id,
                errors: validateAnnotationPayload(annotation).errors,
            }))
            .filter((item) => item.errors.length > 0);

        if (validationErrors.length > 0) {
            return res.status(400).json({
                error: 'Invalid annotation payload',
                details: validationErrors,
            });
        }

        const scopeMismatches = normalized
            .filter((annotation) => annotation.seriesUid !== scopeSeriesUid || annotation.viewerType !== scopeViewerType)
            .map((annotation) => ({
                id: annotation.id,
                series_uid: annotation.seriesUid,
                viewer_type: annotation.viewerType,
            }));

        if (scopeMismatches.length > 0) {
            return res.status(400).json({
                error: 'Annotation payload contains records outside the requested save scope',
                details: scopeMismatches,
            });
        }

        const scopedAnnotations = normalized.filter((annotation) => (
            annotation.seriesUid === scopeSeriesUid
            && annotation.viewerType === scopeViewerType
            && ANNOTATION_TYPES.has(annotation.type)
        ));
        const deletedAnnotationIds = Array.isArray(req.body?.deleted_annotation_ids || req.body?.deletedAnnotationIds)
            ? (req.body.deleted_annotation_ids || req.body.deletedAnnotationIds).map((id) => String(id)).filter(Boolean).slice(0, 1000)
            : [];
        const upsertIds = scopedAnnotations.map((annotation) => annotation.id);
        const existingRows = upsertIds.length > 0
            ? await prisma.$queryRaw(Prisma.sql`
                SELECT id, study_id, series_uid, viewer_type, updated_at
                FROM study_annotations
                WHERE id IN (${Prisma.join(upsertIds)})
            `)
            : [];
        const existingById = new Map(existingRows.map((row) => [row.id, row]));
        const conflicts = [];

        for (const annotation of scopedAnnotations) {
            const existing = existingById.get(annotation.id);
            if (!existing) continue;

            if (existing.study_id !== studyId) {
                conflicts.push({ id: annotation.id, reason: 'Annotation id already belongs to another study' });
                continue;
            }
            if (existing.series_uid !== scopeSeriesUid || existing.viewer_type !== scopeViewerType) {
                conflicts.push({ id: annotation.id, reason: 'Annotation scope mismatch' });
                continue;
            }
            if (
                annotation.updatedAt
                && !Number.isNaN(annotation.updatedAt.getTime())
                && existing.updated_at
                && new Date(existing.updated_at).getTime() > annotation.updatedAt.getTime() + 5
            ) {
                conflicts.push({ id: annotation.id, reason: 'Annotation was modified by another save' });
            }
        }

        if (conflicts.length > 0) {
            return res.status(409).json({
                error: 'Annotation save conflict',
                conflicts,
            });
        }

        const savedRows = await prisma.$transaction(async (tx) => {
            if (deletedAnnotationIds.length > 0) {
                await tx.$executeRaw(Prisma.sql`
                    DELETE FROM study_annotations
                    WHERE study_id = ${studyId}
                      AND series_uid = ${scopeSeriesUid}
                      AND viewer_type = ${scopeViewerType}
                      AND id IN (${Prisma.join(deletedAnnotationIds)})
                `);
            }

            const rows = [];
            for (const annotation of scopedAnnotations) {
                const createdAt = Number.isNaN(annotation.createdAt.getTime()) ? new Date() : annotation.createdAt;
                const [savedRow] = await tx.$queryRaw`
                    INSERT INTO study_annotations (
                      id,
                      study_id,
                      series_uid,
                      viewer_type,
                      slice_axis,
                      slice_index,
                      type,
                      coordinates,
                      label,
                      color,
                      metadata,
                      review_status,
                      reviewed_by,
                      reviewed_at,
                      reviewer_comment,
                      confidence_score,
                      created_by,
                      created_at
                    ) VALUES (
                      ${annotation.id},
                      ${studyId},
                      ${annotation.seriesUid},
                      ${annotation.viewerType},
                      ${annotation.sliceAxis},
                      ${annotation.sliceIndex},
                      ${annotation.type},
                      ${JSON.stringify(annotation.coordinates)}::jsonb,
                      ${annotation.label},
                      ${annotation.color},
                      ${JSON.stringify(annotation.metadata)}::jsonb,
                      ${annotation.reviewStatus},
                      ${annotation.reviewedBy},
                      ${annotation.reviewedAt && !Number.isNaN(annotation.reviewedAt.getTime()) ? annotation.reviewedAt : null},
                      ${annotation.reviewerComment},
                      ${annotation.confidenceScore},
                      ${userId},
                      ${createdAt}
                    )
                    ON CONFLICT (id) DO UPDATE SET
                      slice_axis = EXCLUDED.slice_axis,
                      slice_index = EXCLUDED.slice_index,
                      type = EXCLUDED.type,
                      coordinates = EXCLUDED.coordinates,
                      label = EXCLUDED.label,
                      color = EXCLUDED.color,
                      metadata = EXCLUDED.metadata,
                      updated_at = NOW()
                    RETURNING
                      id,
                      series_uid,
                      viewer_type,
                      slice_axis,
                      slice_index,
                      type,
                      coordinates,
                      label,
                      color,
                      metadata,
                      review_status,
                      reviewed_by,
                      reviewed_at,
                      reviewer_comment,
                      confidence_score,
                      created_by,
                      created_at,
                      updated_at
                `;
                rows.push(savedRow);
            }
            return rows;
        });

        res.json({
            saved: savedRows.length,
            deleted: deletedAnnotationIds.length,
            annotations: savedRows.map(serializeAnnotationRow),
        });
    } catch (error) {
        console.error('Save Study Annotations Error:', error);
        res.status(500).json({ error: 'Failed to save annotations' });
    }
};

export const createAnnotationSnapshot = async (req, res) => {
    try {
        const studyId = parseBigIntId(req.params.id);
        const userId = parseBigIntId(req.user?.id);
        if (!studyId || !userId) {
            return res.status(400).json({ error: 'Invalid study id' });
        }

        const ownership = await requireOwnedStudy(studyId, userId);
        if (ownership.error) {
            return res.status(ownership.error.status).json({ error: ownership.error.message });
        }

        const seriesUid = String(req.body?.series_uid || req.body?.seriesUid || req.query.series_uid || '');
        if (!seriesUid) {
            return res.status(400).json({ error: 'series_uid is required' });
        }

        const annotationsPayload = Array.isArray(req.body?.annotations) ? req.body.annotations : [];
        const normalized = annotationsPayload
            .map((annotation) => normalizeAnnotationInput(annotation, { series_uid: seriesUid }))
            .filter((annotation) => annotation.seriesUid === seriesUid && ANNOTATION_TYPES.has(annotation.type));
        const validationErrors = normalized
            .map((annotation) => ({
                id: annotation.id,
                errors: validateAnnotationPayload(annotation).errors,
            }))
            .filter((item) => item.errors.length > 0);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                error: 'Invalid annotation snapshot payload',
                details: validationErrors,
            });
        }
        const snapshotId = randomUUID();
        const note = req.body?.note ? String(req.body.note).slice(0, 1000) : null;
        const featureState = req.body?.feature_state && typeof req.body.feature_state === 'object'
            ? req.body.feature_state
            : {};

        const rows = await prisma.$queryRaw`
            INSERT INTO annotation_snapshots (
              id,
              study_id,
              series_uid,
              created_by,
              note,
              annotations,
              feature_state
            ) VALUES (
              ${snapshotId},
              ${studyId},
              ${seriesUid},
              ${userId},
              ${note},
              ${JSON.stringify(normalized.map((annotation) => ({
                  id: annotation.id,
                  series_uid: annotation.seriesUid,
                  viewer_type: annotation.viewerType,
                  slice_axis: annotation.sliceAxis,
                  slice_index: annotation.sliceIndex,
                  annotation_type: annotation.type,
                  type: annotation.type,
                  coordinates: annotation.coordinates,
                  label: annotation.label,
                  color: annotation.color,
                  metadata: annotation.metadata,
                  review_status: annotation.reviewStatus,
                  confidence_score: annotation.confidenceScore,
                  created_at: annotation.createdAt,
              })))}::jsonb,
              ${JSON.stringify(featureState)}::jsonb
            )
            RETURNING id, study_id, series_uid, snapshot_at, created_by, note, annotations, feature_state
        `;

        res.status(201).json({ snapshot: serializeSnapshotRow(rows[0]) });
    } catch (error) {
        console.error('Create Annotation Snapshot Error:', error);
        res.status(500).json({ error: 'Failed to create annotation snapshot' });
    }
};

export const getAnnotationSnapshots = async (req, res) => {
    try {
        const studyId = parseBigIntId(req.params.id);
        const userId = parseBigIntId(req.user?.id);
        if (!studyId || !userId) {
            return res.status(400).json({ error: 'Invalid study id' });
        }

        const ownership = await requireOwnedStudy(studyId, userId);
        if (ownership.error) {
            return res.status(ownership.error.status).json({ error: ownership.error.message });
        }

        const filters = [Prisma.sql`study_id = ${studyId}`];
        if (req.query.series_uid) {
            filters.push(Prisma.sql`series_uid = ${String(req.query.series_uid)}`);
        }

        const rows = await prisma.$queryRaw(Prisma.sql`
            SELECT id, study_id, series_uid, snapshot_at, created_by, note, annotations, feature_state
            FROM annotation_snapshots
            WHERE ${Prisma.join(filters, ' AND ')}
            ORDER BY snapshot_at DESC
        `);

        res.json({ snapshots: rows.map(serializeSnapshotRow) });
    } catch (error) {
        console.error('Get Annotation Snapshots Error:', error);
        res.status(500).json({ error: 'Failed to load annotation snapshots' });
    }
};

export const deleteAnnotationSnapshot = async (req, res) => {
    try {
        const studyId = parseBigIntId(req.params.id);
        const userId = parseBigIntId(req.user?.id);
        const snapshotId = String(req.params.snapshotId || '');
        if (!studyId || !userId || !snapshotId) {
            return res.status(400).json({ error: 'Invalid study or snapshot id' });
        }

        const ownership = await requireOwnedStudy(studyId, userId);
        if (ownership.error) {
            return res.status(ownership.error.status).json({ error: ownership.error.message });
        }

        const rows = await prisma.$queryRaw`
            DELETE FROM annotation_snapshots
            WHERE id = ${snapshotId}
              AND study_id = ${studyId}
            RETURNING id
        `;

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Annotation snapshot not found' });
        }

        res.json({ deleted: 1, id: snapshotId });
    } catch (error) {
        console.error('Delete Annotation Snapshot Error:', error);
        res.status(500).json({ error: 'Failed to delete annotation snapshot' });
    }
};

export const reviewStudyAnnotations = async (req, res) => {
    try {
        const studyId = parseBigIntId(req.params.id);
        const userId = parseBigIntId(req.user?.id);
        if (!studyId || !userId) {
            return res.status(400).json({ error: 'Invalid study id' });
        }

        const ownership = await requireOwnedStudy(studyId, userId);
        if (ownership.error) {
            return res.status(ownership.error.status).json({ error: ownership.error.message });
        }

        const reviewStatus = normalizeReviewStatus(req.body?.review_status || req.body?.reviewStatus, null);
        if (!reviewStatus) {
            return res.status(400).json({ error: 'review_status must be draft, submitted, approved, or rejected' });
        }

        const rawIds = req.body?.annotation_ids || req.body?.annotationIds || [];
        const annotationIds = Array.isArray(rawIds)
            ? rawIds.map((id) => String(id)).filter(Boolean).slice(0, 500)
            : [];
        const seriesUid = req.body?.series_uid || req.body?.seriesUid ? String(req.body.series_uid || req.body.seriesUid) : '';
        const viewerType = req.body?.viewer_type || req.body?.viewerType ? String(req.body.viewer_type || req.body.viewerType).toLowerCase() : '';
        const reviewerComment = req.body?.reviewer_comment || req.body?.reviewerComment
            ? String(req.body.reviewer_comment || req.body.reviewerComment).slice(0, 1000)
            : null;
        const confidenceScore = confidenceForStatus(reviewStatus);
        const reviewedBy = reviewStatus === 'approved' || reviewStatus === 'rejected' ? userId : null;
        const reviewedAt = reviewStatus === 'approved' || reviewStatus === 'rejected' ? new Date() : null;

        let whereClause;
        if (annotationIds.length > 0) {
            whereClause = Prisma.sql`study_id = ${studyId} AND id IN (${Prisma.join(annotationIds)})`;
        } else if (seriesUid && viewerType) {
            whereClause = Prisma.sql`study_id = ${studyId} AND series_uid = ${seriesUid} AND viewer_type = ${viewerType}`;
        } else {
            return res.status(400).json({ error: 'annotation_ids or series_uid + viewer_type are required' });
        }

        if (reviewStatus === 'submitted' || reviewStatus === 'approved') {
            const candidates = await prisma.$queryRaw(Prisma.sql`
                SELECT
                  id,
                  series_uid,
                  viewer_type,
                  slice_axis,
                  slice_index,
                  type,
                  coordinates,
                  label,
                  color,
                  metadata,
                  ${reviewStatus}::text AS review_status,
                  reviewed_by,
                  reviewed_at,
                  reviewer_comment,
                  confidence_score,
                  created_by,
                  created_at,
                  updated_at
                FROM study_annotations
                WHERE ${whereClause}
            `);
            const validationErrors = candidates
                .map((row) => ({
                    id: row.id,
                    errors: validateAnnotationPayload({
                        ...serializeAnnotationRow(row),
                        seriesUid: row.series_uid,
                        viewerType: row.viewer_type,
                        reviewStatus,
                    }).errors,
                }))
                .filter((item) => item.errors.length > 0);

            if (validationErrors.length > 0) {
                return res.status(400).json({
                    error: 'Annotations are not ready for review',
                    details: validationErrors,
                });
            }
        }

        const rows = await prisma.$queryRaw(Prisma.sql`
            UPDATE study_annotations
            SET review_status = ${reviewStatus},
                reviewed_by = ${reviewedBy},
                reviewed_at = ${reviewedAt},
                reviewer_comment = ${reviewerComment},
                confidence_score = ${confidenceScore}
            WHERE ${whereClause}
            RETURNING
              id,
              series_uid,
              viewer_type,
              slice_axis,
              slice_index,
              type,
              coordinates,
              label,
              color,
              metadata,
              review_status,
              reviewed_by,
              reviewed_at,
              reviewer_comment,
              confidence_score,
              created_by,
              created_at,
              updated_at
        `);

        res.json({ updated: rows.length, annotations: rows.map(serializeAnnotationRow) });
    } catch (error) {
        console.error('Review Study Annotations Error:', error);
        res.status(500).json({ error: 'Failed to update annotation review status' });
    }
};

export const getStorageStats = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = BigInt(req.user.id);
        console.log(`[X-Core] Fetching storage stats for user: ${userId}`);

        const dentistProfile = await prisma.dentistProfile.findFirst({
            where: { userId: userId },
            select: { id: true, storage_usage: true, storage_limit: true }
        });

        console.log(`[X-Core] Profile found for stats: ${!!dentistProfile}`);

        if (!dentistProfile) {
            return res.json({
                usage: "0",
                limit: "10737418240",
                percent: 0
            });
        }

        // Self-heal: Recalculate actual disk usage from existing studies
        // This fixes any accounting drift (e.g. from VTI files not being tracked)
        const studies = await prisma.imagingStudy.findMany({
            where: { dentistId: userId },
            select: { folderName: true, sizeInBytes: true }
        });

        let actualTotal = 0n;
        for (const s of studies) {
            if (s.folderName) {
                const studyDir = path.join(UPLOAD_DIR, s.folderName);
                const diskSize = getDirSizeBytes(studyDir);
                actualTotal += diskSize > 0n ? diskSize : (s.sizeInBytes || 0n);
            } else {
                actualTotal += s.sizeInBytes || 0n;
            }
        }

        // If recalculated value differs from stored, update the profile
        const storedUsage = dentistProfile.storage_usage || 0n;
        if (actualTotal !== storedUsage) {
            console.log(`[X-Core] Storage self-heal: stored=${storedUsage}, actual=${actualTotal}, fixing...`);
            await prisma.dentistProfile.update({
                where: { id: dentistProfile.id },
                data: { storage_usage: actualTotal }
            });
        }

        const limit = dentistProfile.storage_limit || 10737418240n;
        const percent = limit > 0n ? Number((actualTotal * 100n) / limit) : 0;

        res.json({
            usage: actualTotal.toString(),
            limit: limit.toString(),
            percent: Math.min(percent, 100)
        });
    } catch (error) {
        console.error('Storage Stats Error:', error);
        res.status(500).json({ error: 'Failed to fetch storage stats' });
    }
};

export const deleteStudy = async (req, res) => {
    try {
        const { id } = req.params;
        const studyId = BigInt(id);

        const study = await prisma.imagingStudy.findUnique({
            where: { id: studyId },
            include: { dentist: { include: { dentistProfile: true } } }
        });

        console.log(`[X-Core] Deleting study: ${studyId}, Found: ${!!study}`);

        if (!study) {
            return res.status(404).json({ error: 'Study not found' });
        }

        // Security Check: Ensure the user owns this study
        if (study.dentistId !== BigInt(req.user.id)) {
            console.error(`[X-Core] Unauthorized delete attempt. User: ${req.user.id}, Study Owner: ${study.dentistId}`);
            return res.status(403).json({ error: 'You do not have permission to delete this study' });
        }

        // Calculate ACTUAL disk usage (includes VTI, thumbnails, generated images)
        // This is more accurate than sizeInBytes which only tracks the original upload
        let actualDiskSize = study.sizeInBytes || 0n;
        if (study.folderName) {
            const studyDir = path.join(UPLOAD_DIR, study.folderName);
            const diskSize = getDirSizeBytes(studyDir);
            if (diskSize > 0n) {
                actualDiskSize = diskSize;
            }
        }
        console.log(`[X-Core] Study ${studyId}: DB sizeInBytes=${study.sizeInBytes}, actualDiskSize=${actualDiskSize}`);

        // Transaction: Delete DB record & Update Storage Usage
        await prisma.$transaction(async (tx) => {
            // 1. Delete all AI results for series in this study
            const seriesIds = await tx.imagingSeries.findMany({
                where: { studyId },
                select: { id: true }
            });
            if (seriesIds.length > 0) {
                await tx.aIResult.deleteMany({
                    where: { seriesId: { in: seriesIds.map(s => s.id) } }
                });
            }

            // 2. Delete series
            await tx.imagingSeries.deleteMany({
                where: { studyId }
            });

            // 3. Delete Study
            await tx.imagingStudy.delete({
                where: { id: studyId }
            });

            // 4. Decrement Storage Usage by actual disk size
            if (study.dentistId) {
                const dentistProfile = await tx.dentistProfile.findFirst({
                    where: { userId: study.dentistId }
                });

                if (dentistProfile) {
                    const newUsage = (dentistProfile.storage_usage || 0n) - actualDiskSize;
                    await tx.dentistProfile.update({
                        where: { id: dentistProfile.id },
                        data: {
                            storage_usage: newUsage < 0n ? 0n : newUsage
                        }
                    });
                    console.log(`[X-Core] Storage updated: ${dentistProfile.storage_usage} - ${actualDiskSize} = ${newUsage < 0n ? 0n : newUsage}`);
                }
            }
        });

        // 5. Delete Files from Disk (after DB success)
        if (study.folderName) {
            const studyDir = path.join(UPLOAD_DIR, study.folderName);
            if (fs.existsSync(studyDir)) {
                fs.rmSync(studyDir, { recursive: true, force: true });
                console.log(`[X-Core] Deleted folder: ${studyDir}`);
            } else {
                console.log(`[X-Core] Folder already removed: ${studyDir}`);
            }
        }

        res.json({ message: 'Study deleted successfully' });

    } catch (error) {
        console.error('Delete Study Error:', error);
        res.status(500).json({ error: 'Failed to delete study: ' + error.message });
    }
};

export const createStudyShare = async (req, res) => {
    try {
        const { id } = req.params;
        const studyId = BigInt(id);
        const expiresInHours = Number(req.body?.expiresInHours);

        if (!ALLOWED_SHARE_EXPIRY_HOURS.has(expiresInHours)) {
            return res.status(400).json({ error: 'expiresInHours must be one of 24, 48, 72, or 168' });
        }

        const study = await prisma.imagingStudy.findUnique({
            where: { id: studyId },
            include: {
                patient: { select: { name: true } },
            },
        });

        if (!study) {
            return res.status(404).json({ error: 'Study not found' });
        }

        if (study.dentistId !== BigInt(req.user.id)) {
            return res.status(403).json({ error: 'You do not have permission to share this study' });
        }

        const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));
        const token = jwt.sign(
            {
                studyId: study.id.toString(),
                folderId: study.folderName,
            },
            getShareSecret(),
            { expiresIn: `${expiresInHours}h` }
        );

        await prisma.studyShare.create({
            data: {
                studyId: study.id,
                token,
                expiresAt,
            },
        });

        const baseUrl = buildPublicAppBaseUrl(req);
        const shareUrl = `${baseUrl}/shared/${token}`;

        res.json({
            shareUrl,
            token,
            expiresAt: expiresAt.toISOString(),
            patientName: cleanPatientName(study.metadata?.PatientName, study.patient?.name || study.originalName || 'Patient'),
        });
    } catch (error) {
        console.error('Create Study Share Error:', error);
        res.status(500).json({ error: error.message || 'Failed to create study share' });
    }
};

export const validateStudyShareToken = async (req, res) => {
    try {
        const { token } = req.params;
        const { error, detail, shareRecord } = await resolveStudyShareRecord(token, { includeStudy: true });

        if (error === 'expired') {
            return res.status(410).json({ error: detail });
        }
        if (error) {
            return res.status(404).json({ error: detail });
        }

        res.json({
            valid: true,
            studyId: shareRecord.studyId.toString(),
            folderId: shareRecord.study.folderName,
            folderName: shareRecord.study.folderName,
            expiresAt: shareRecord.expiresAt.toISOString(),
        });
    } catch (error) {
        console.error('Validate Study Share Error:', error);
        res.status(500).json({ error: 'Failed to validate share token' });
    }
};

export const getSharedStudy = async (req, res) => {
    try {
        const { token } = req.params;
        const resolved = await resolveStudyShareRecord(token, { includeStudy: true });

        if (resolved.error === 'expired') {
            return res.status(410).json({ error: resolved.detail });
        }
        if (resolved.error) {
            return res.status(404).json({ error: resolved.detail });
        }

        const { shareRecord } = resolved;
        const study = shareRecord.study;

        let series = [];
        try {
            series = await fetchStudySeriesForShare(study.folderName);
        } catch (seriesError) {
            console.warn('[X-Core] Shared study series fetch failed:', seriesError.message);
        }

        const patientName = cleanPatientName(
            study.metadata?.PatientName,
            study.patient?.name || study.originalName || 'Patient'
        );

        res.json({
            folderName: study.folderName,
            patientName,
            studyDate: study.studyDate,
            description: study.description || study.metadata?.StudyDescription || null,
            modality: study.modality,
            expiresAt: shareRecord.expiresAt.toISOString(),
            token,
            shareToken: token,
            series,
        });
    } catch (error) {
        console.error('Get Shared Study Error:', error);
        res.status(500).json({ error: 'Failed to load shared study' });
    }
};
