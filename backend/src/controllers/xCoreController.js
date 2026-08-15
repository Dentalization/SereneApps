import { Prisma, PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { validateAnnotationPayload } from '../utils/xCoreAnnotationValidation.js';
import { emitPortalInvalidation } from '../services/portalCollaboration.js';
import {
    activeDentistClinicIds,
    clinicStudyScopeWhere,
    clinicStudyScopeWhereForClinicIds,
    eligibleShareDentists,
    getClinicXCoreContext,
    handleAccessError,
    requireEligibleShareRecipient,
    requireDentistPatientRelationship,
    requireXCoreStudyOwner,
    requireXCoreStudyReadAccess,
    serializeEligibleDentist,
    shareableClinicIdsForOwnedStudy,
    clinicIdsForStudy,
    clinicIdsIntersect,
} from '../services/xCoreAccessPolicyService.js';

const prisma = new PrismaClient();
const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '../../uploads/x-core');
const PY_SERVICE_BASE_URL = process.env.XCORE_PY_API_BASE_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';
const ANNOTATION_TYPES = new Set(['arrow', 'circle', 'text', 'freehand', 'region', 'brush', 'measurement']);
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

function parseBigIntId(value) {
    try {
        return BigInt(value);
    } catch {
        return null;
    }
}

function removeUploadedTempFiles(files = []) {
    for (const file of files) {
        try {
            if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch (error) {
            console.warn('[X-Core] Failed to remove rejected temp upload:', error.message);
        }
    }
}

export function logBackendEvent(runId, eventType, details = {}) {
    if (!runId) return;
    try {
        const resultsDir = path.join(__dirname, '../../../scripts/xcore-benchmark/results/raw');
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
        const logFile = path.join(resultsDir, `backend-events-${runId}.jsonl`);
        // Remove patient identity from details if present (double safety)
        const safeDetails = { ...details };
        delete safeDetails.patientName;
        delete safeDetails.PatientName;
        delete safeDetails.patientId;
        delete safeDetails.PatientID;
        delete safeDetails.DOB;
        delete safeDetails.dob;
        
        const entry = JSON.stringify({
            runId,
            eventType,
            timestamp: new Date().toISOString(),
            details: safeDetails
        });
        fs.appendFileSync(logFile, entry + '\n');
    } catch (e) {
        console.error('[X-Core Benchmark] Error writing backend event log:', e);
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
    try {
        const ownerAccess = await requireXCoreStudyOwner({
            studyId,
            user: { id: userId },
            prismaClient: prisma,
        });
        return { study: ownerAccess.study };
    } catch (error) {
        return { error: { status: error.status || 500, message: error.message } };
    }
}

function decorateStudyForResponse(study, accessScope = 'owner') {
    const { dentistShares, dentist, ...rest } = study;
    return {
        ...rest,
        ownerDentist: dentist
            ? {
                id: dentist.id,
                name: dentist.name,
                email: dentist.email,
            }
            : null,
        xcoreAccessScope: accessScope,
        sharedWithMe: accessScope === 'shared_with_me',
    };
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
        const authenticatedDentistId = parseBigIntId(req.user?.id);
        if (!authenticatedDentistId) {
            removeUploadedTempFiles(req.files);
            return res.status(401).json({ error: 'Authentication required' });
        }

        const runId = req.headers['x-benchmark-run-id'];
        const caseId = req.headers['x-benchmark-case-id'];
        const iteration = req.headers['x-benchmark-iteration'];

        const patientId = req.body.patientId ? parseBigIntId(req.body.patientId) : null;
        if (req.body.patientId && !patientId) {
            removeUploadedTempFiles(req.files);
            return res.status(400).json({ error: 'Invalid patientId', code: 'invalid_patient_id' });
        }
        // 0. Calculate Upload Size
        const uploadSize = req.files.reduce((acc, file) => acc + BigInt(file.size), 0n);

        if (runId) {
            logBackendEvent(runId, 'upload_request_received', {
                caseId,
                iteration,
                fileSize: uploadSize.toString(),
                fileCount: req.files.length
            });
        }

        // 1. Check Storage Quota (if user is authenticated)
        let dentistProfile = null;
        let userId = authenticatedDentistId;
        let uploadClinicId = null;

        if (req.user) {
            console.log(`[X-Core] Uploading for user: ${userId}`);
            console.log(`[X-Core] Received originalFolderName: ${req.body.originalFolderName}`);

            dentistProfile = await prisma.dentistProfile.findFirst({
                where: { userId: userId }
            });

            console.log(`[X-Core] Dentist Profile found: ${!!dentistProfile}`);
            if (dentistProfile) {
                console.log(`[X-Core] Current Usage: ${dentistProfile.storage_usage}, Limit: ${dentistProfile.storage_limit}`);
                uploadClinicId = dentistProfile.clinic_id || null;
            }

            if (!uploadClinicId) {
                const clinicStaff = req.user.clinicStaff;
                if (clinicStaff?.isActive && clinicStaff.role === 'dentist' && clinicStaff.clinicProfileId) {
                    uploadClinicId = BigInt(clinicStaff.clinicProfileId);
                }
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

            if (patientId) {
                try {
                    await requireDentistPatientRelationship({
                        dentistId: userId,
                        patientId,
                        prismaClient: prisma,
                    });
                } catch (error) {
                    removeUploadedTempFiles(req.files);
                    return handleAccessError(res, error);
                }
            }
        }

        // Create a unique folder for this upload batch
        const batchId = Date.now().toString();
        const studyDir = path.join(UPLOAD_DIR, batchId);
        fs.mkdirSync(studyDir);

        // Move files to study folder — skip macOS/system hidden files
        for (const file of req.files) {
            // Skip hidden files like .DS_Store that macOS adds to folders
            const basename = path.basename(file.originalname);
            if (basename.startsWith('.')) {
                try { fs.unlinkSync(file.path); } catch (_) { /* ignore */ }
                continue;
            }
            const targetPath = path.join(studyDir, file.originalname);
            const parentDir = path.dirname(targetPath);
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }
            // Only rename if the temp file still exists
            if (fs.existsSync(file.path)) {
                fs.renameSync(file.path, targetPath);
            }
        }

        if (runId) {
            logBackendEvent(runId, 'upload_saved', { folderName: batchId });
            logBackendEvent(runId, 'metadata_parse_requested', { folderName: batchId });
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

        if (runId) {
            logBackendEvent(runId, 'metadata_parse_completed', { folderName: batchId, modality: parseResult.modality });
        }

        // Create Database Records
        const result = await prisma.$transaction(async (tx) => {
            const targetPatientId = patientId;

            let studyMetadata = parseResult.metadata || {};
            if (runId) {
                studyMetadata = {
                    ...studyMetadata,
                    is_benchmark: true,
                    benchmark_run_id: runId,
                    benchmark_case_id: caseId || null,
                    benchmark_iteration: iteration ? parseInt(iteration) : null
                };
            }

            // 1. Create Study
            const study = await tx.imagingStudy.create({
                data: {
                    patientId: targetPatientId ?? null,
                    studyDate: parseResult.metadata.Date ? new Date(parseResult.metadata.Date) : new Date(),
                    modality: parseResult.modality,
                    folderName: batchId,
                    originalName: req.body.originalFolderName || batchId,
                    status: 'processed',
                    metadata: studyMetadata,
                    sizeInBytes: uploadSize,
                    dentistId: req.user ? BigInt(req.user.id) : undefined,
                    clinicId: uploadClinicId || undefined
                }
            });

            if (userId && targetPatientId) {
                await tx.imagingStudyPatientAssignment.create({
                    data: {
                        studyId: study.id,
                        previousPatientId: null,
                        patientId: targetPatientId,
                        assignedByDentistId: userId,
                        source: 'upload',
                    },
                });
            }

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

        if (runId) {
            logBackendEvent(runId, 'conversion_requested', { studyId: result.id.toString(), folderName: batchId });
        }

        // Handle BigInt serialization
        const response = serializeJson(result);

        emitPortalInvalidation({
            io: req.app?.get?.('io'),
            eventName: 'xcore:study_updated',
            entity: 'imaging_study',
            entityId: result.id,
            action: 'created',
            patientId: result.patientId,
            dentistId: result.dentistId,
            clinicProfileId: result.clinicId,
        });

        // Trigger background VTI conversion (fire-and-forget)
        // This pre-computes the 3D .vti file so it's ready when user opens the viewer
        try {
            const headersToSend = {};
            if (runId) {
                headersToSend['x-benchmark-run-id'] = runId;
                if (caseId) headersToSend['x-benchmark-case-id'] = caseId;
                if (iteration) headersToSend['x-benchmark-iteration'] = iteration;
            }
            fetch(`${PY_SERVICE_BASE_URL}/convert/${batchId}`, {
                method: 'POST',
                headers: headersToSend
            })
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
        const activeClinicIds = await activeDentistClinicIds(userId, { prismaClient: prisma });
        const sharedStudyWhere = activeClinicIds.length > 0
            ? {
                AND: [
                    {
                        dentistShares: {
                            some: {
                                recipientDentistId: userId,
                                revokedAt: null,
                            },
                        },
                    },
                    clinicStudyScopeWhereForClinicIds(activeClinicIds),
                ],
            }
            : null;

        const studies = await prisma.imagingStudy.findMany({
            where: sharedStudyWhere
                ? { OR: [{ dentistId: userId }, sharedStudyWhere] }
                : { dentistId: userId },
            include: {
                patient: { select: { name: true, phone_number: true } },
                series: true,
                dentist: { select: { id: true, name: true, email: true } },
                dentistShares: {
                    where: {
                        recipientDentistId: userId,
                        revokedAt: null,
                    },
                    select: { id: true },
                },
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`[X-Core] Found ${studies.length} studies for user ${userId}`);

        res.json(serializeJson(studies.map((study) => decorateStudyForResponse(
            study,
            study.dentistId === userId ? 'owner' : 'shared_with_me'
        ))));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getClinicStudies = async (req, res) => {
    try {
        const context = await getClinicXCoreContext(req.user, { prismaClient: prisma });
        console.log(`[X-Core] Fetching clinic-scoped studies for clinic: ${context.clinicProfileId}`);

        const studies = await prisma.imagingStudy.findMany({
            where: clinicStudyScopeWhere(context.clinicProfileId),
            include: {
                patient: { select: { name: true, phone_number: true } },
                series: true,
                dentist: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(serializeJson(studies.map((study) => decorateStudyForResponse(study, 'clinic'))));
    } catch (error) {
        if (error?.status) {
            return handleAccessError(res, error);
        }
        console.error('Get Clinic Studies Error:', error);
        res.status(500).json({ error: 'Failed to load clinic X-Core studies' });
    }
};

export function computeSourceInstanceKeyFromAnnotation(annotation = {}, scope = {}) {
    const seriesUid = String(annotation.seriesUid || annotation.series_uid || scope.series_uid || scope.seriesUid || '').trim();
    const sopInstanceUid = annotation.sopInstanceUid || annotation.sop_instance_uid || scope.sop_instance_uid || scope.sopInstanceUid
        ? String(annotation.sopInstanceUid || annotation.sop_instance_uid || scope.sop_instance_uid || scope.sopInstanceUid).trim()
        : null;
    const rawFrameIndex = annotation.frameIndex ?? annotation.frame_index ?? scope.frame_index ?? scope.frameIndex;
    const frameIndex = rawFrameIndex != null && Number.isInteger(Number(rawFrameIndex)) && Number(rawFrameIndex) >= 0
        ? Number(rawFrameIndex)
        : null;
    const rawImageIndex = annotation.imageIndex ?? annotation.image_index ?? scope.image_index ?? scope.imageIndex;
    const imageIndex = rawImageIndex != null && Number.isInteger(Number(rawImageIndex)) && Number(rawImageIndex) >= 0
        ? Number(rawImageIndex)
        : null;

    if (sopInstanceUid) {
        if (frameIndex != null) return `sop:${sopInstanceUid}:frame:${frameIndex}`;
        return `sop:${sopInstanceUid}`;
    }
    if (imageIndex != null) {
        return `series:${seriesUid}:image:${imageIndex}`;
    }
    return annotation.sourceInstanceKey || annotation.source_instance_key || scope.source_instance_key || scope.sourceInstanceKey || `series:${seriesUid}:legacy`;
}

function normalizeAnnotationInput(annotation, defaults = {}) {
    const seriesUid = String(annotation.series_uid || annotation.seriesUid || defaults.series_uid || defaults.seriesUid || '');
    const viewerType = String(annotation.viewer_type || annotation.viewerType || defaults.viewer_type || defaults.viewerType || '').toLowerCase();
    const sliceAxis = annotation.slice_axis || annotation.sliceAxis;
    const sliceIndexValue = annotation.slice_index ?? annotation.sliceIndex;
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
    const type = annotation.type || annotation.annotation_type;
    if (type !== 'text') {
        metadata.finding_type = metadata.finding_type || (type === 'measurement' ? 'measurement' : 'other');
        metadata.severity = metadata.severity || 'S1';
    }

    const sopInstanceUid = annotation.sop_instance_uid || annotation.sopInstanceUid || defaults.sop_instance_uid || defaults.sopInstanceUid || null;
    const instanceNumber = (annotation.instance_number ?? annotation.instanceNumber ?? defaults.instance_number ?? defaults.instanceNumber) != null
        ? Number(annotation.instance_number ?? annotation.instanceNumber ?? defaults.instance_number ?? defaults.instanceNumber)
        : null;
    const frameIndex = (annotation.frame_index ?? annotation.frameIndex ?? defaults.frame_index ?? defaults.frame_index) != null
        ? Number(annotation.frame_index ?? annotation.frameIndex ?? defaults.frame_index ?? defaults.frame_index)
        : null;
    const imageIndex = (annotation.image_index ?? annotation.imageIndex ?? defaults.image_index ?? defaults.image_index) != null
        ? Number(annotation.image_index ?? annotation.imageIndex ?? defaults.image_index ?? defaults.image_index)
        : null;
    const sourceInstanceKey = computeSourceInstanceKeyFromAnnotation(annotation, defaults);

    return {
        id: annotation.id && String(annotation.id).length <= 120 ? String(annotation.id) : randomUUID(),
        seriesUid,
        viewerType,
        sliceAxis: sliceAxis ? String(sliceAxis).toLowerCase() : null,
        sliceIndex: Number.isInteger(sliceIndex) ? sliceIndex : null,
        sopInstanceUid: sopInstanceUid ? String(sopInstanceUid).trim() : null,
        instanceNumber: Number.isInteger(instanceNumber) && instanceNumber > 0 ? instanceNumber : null,
        frameIndex: Number.isInteger(frameIndex) && frameIndex >= 0 ? frameIndex : null,
        imageIndex: Number.isInteger(imageIndex) && imageIndex >= 0 ? imageIndex : null,
        sourceInstanceKey,
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
        sop_instance_uid: row.sop_instance_uid,
        instance_number: row.instance_number,
        frame_index: row.frame_index,
        image_index: row.image_index,
        source_instance_key: row.source_instance_key,
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

export const getSeriesInstances = async (req, res) => {
    try {
        const studyId = parseBigIntId(req.params.studyId || req.params.id);
        const seriesUid = String(req.params.seriesUid);
        if (!studyId || !seriesUid) {
            return res.status(400).json({ error: 'Invalid study or series' });
        }

        await requireXCoreStudyReadAccess({ studyId, user: req.user, prismaClient: prisma });

        const study = await prisma.imagingStudy.findFirst({
            where: { id: studyId },
            include: { series: true }
        });
        if (!study) {
            return res.status(404).json({ error: 'Study not found' });
        }

        const seriesRecord = study.series?.find(
            (s) => String(s.seriesUid || s.id) === seriesUid || String(s.id) === seriesUid
        ) || null;

        // --- Try Python service for real instance metadata ---
        const studyKey = study.folderName || String(studyId);
        let instances = [];
        let pythonServiceSucceeded = false;

        try {
            const pyUrl = `${PY_SERVICE_BASE_URL}/instances/${encodeURIComponent(studyKey)}/${encodeURIComponent(seriesUid)}`;
            const pyResp = await fetch(pyUrl, { signal: AbortSignal.timeout(8000) });
            if (pyResp.ok) {
                const pyData = await pyResp.json();
                if (Array.isArray(pyData.instances) && pyData.instances.length > 0) {
                    instances = pyData.instances.map((inst, idx) => ({
                        sop_instance_uid: inst.sop_instance_uid || null,
                        instance_number: inst.instance_number || (idx + 1),
                        frame_count: inst.frame_count || 1,
                        image_index: inst.image_index ?? idx,
                        source_kind: inst.source_kind || 'DICOM',
                        source_path: inst.source_path || null,
                        width: inst.width || 0,
                        height: inst.height || 0,
                        modality: inst.modality || seriesRecord?.modality || study.modality || 'DX',
                        acquisition_date: study.studyDate ? study.studyDate.toISOString() : new Date().toISOString(),
                        thumbnail_url: inst.thumbnail_url || `/thumb/${studyKey}/${seriesUid}?index=${idx}`,
                        display_label: inst.display_label || `Image ${inst.instance_number || idx + 1}`,
                        source_instance_key: inst.source_instance_key || (
                            inst.sop_instance_uid
                                ? `sop:${inst.sop_instance_uid}`
                                : `series:${seriesUid}:image:${inst.image_index ?? idx}`
                        ),
                    }));
                    pythonServiceSucceeded = true;
                }
            }
        } catch (pyError) {
            console.warn('[getSeriesInstances] Python service unavailable, falling back to filesystem scan:', pyError.message);
        }

        // --- Filesystem fallback (when Python service is offline) ---
        if (!pythonServiceSucceeded) {
            const studyPath = path.join(UPLOAD_DIR, studyKey);
            if (fs.existsSync(studyPath)) {
                const files = fs.readdirSync(studyPath).filter((f) => !f.startsWith('.'));
                const imageFiles = files.filter((f) => /\.(dcm|dcom|dicom|ima|jpg|jpeg|png)$/i.test(f) || !f.includes('.'));

                if (imageFiles.length > 0) {
                    imageFiles.forEach((file, index) => {
                        const ext = path.extname(file).toLowerCase();
                        const isStatic = ['.jpg', '.jpeg', '.png'].includes(ext);
                        const sourceKind = isStatic ? 'STATIC_PNG' : 'DICOM';
                        const sourceInstanceKey = `series:${seriesUid}:image:${index}`;

                        instances.push({
                            sop_instance_uid: null,
                            instance_number: index + 1,
                            frame_count: 1,
                            image_index: index,
                            source_kind: sourceKind,
                            source_path: file,
                            width: 0,
                            height: 0,
                            modality: seriesRecord?.modality || study.modality || 'DX',
                            acquisition_date: study.studyDate ? study.studyDate.toISOString() : new Date().toISOString(),
                            thumbnail_url: `/thumb/${studyKey}/${seriesUid}?index=${index}`,
                            display_label: isStatic ? file : `Image ${index + 1}`,
                            source_instance_key: sourceInstanceKey,
                        });
                    });
                }
            }
        }

        // --- Ultimate fallback: single legacy instance ---
        if (instances.length === 0) {
            instances.push({
                sop_instance_uid: null,
                instance_number: 1,
                frame_count: 1,
                image_index: 0,
                source_kind: 'DICOM',
                source_path: '',
                width: 0,
                height: 0,
                modality: seriesRecord?.modality || study.modality || 'DX',
                acquisition_date: study.studyDate ? study.studyDate.toISOString() : new Date().toISOString(),
                thumbnail_url: `/thumb/${studyKey}/${seriesUid}`,
                display_label: 'Image 1',
                source_instance_key: `series:${seriesUid}:legacy`,
            });
        }

        res.json({
            study_id: String(studyId),
            series_uid: seriesUid,
            instances,
        });
    } catch (error) {
        if (error?.status) {
            return handleAccessError(res, error);
        }
        console.error('Get Series Instances Error:', error);
        res.status(500).json({ error: 'Failed to load series instances' });
    }
};


export const getStudyAnnotations = async (req, res) => {
    try {
        const studyId = parseBigIntId(req.params.id);
        const userId = parseBigIntId(req.user?.id);
        if (!studyId || !userId) {
            return res.status(400).json({ error: 'Invalid study id' });
        }

        await requireXCoreStudyReadAccess({ studyId, user: req.user, prismaClient: prisma });

        const filters = [Prisma.sql`study_id = ${studyId}`];
        if (req.query.series_uid) {
            filters.push(Prisma.sql`series_uid = ${String(req.query.series_uid)}`);
        }
        if (req.query.viewer_type) {
            filters.push(Prisma.sql`viewer_type = ${String(req.query.viewer_type).toLowerCase()}`);
        }
        if (req.query.source_instance_key) {
            const key = String(req.query.source_instance_key);
            filters.push(Prisma.sql`(source_instance_key = ${key} OR source_instance_key IS NULL OR source_instance_key = ${`series:${req.query.series_uid}:legacy`})`);
        } else if (req.query.sop_instance_uid) {
            const sopUid = String(req.query.sop_instance_uid);
            filters.push(Prisma.sql`(sop_instance_uid = ${sopUid} OR source_instance_key IS NULL)`);
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
              sop_instance_uid,
              instance_number,
              frame_index,
              image_index,
              source_instance_key,
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
        if (error?.status) {
            return handleAccessError(res, error);
        }
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
                ...defaults,
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
                && new Date(existing.updated_at).getTime() > annotation.updatedAt.getTime() + 5000
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
                      sop_instance_uid,
                      instance_number,
                      frame_index,
                      image_index,
                      source_instance_key,
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
                      ${annotation.sopInstanceUid},
                      ${annotation.instanceNumber},
                      ${annotation.frameIndex},
                      ${annotation.imageIndex},
                      ${annotation.sourceInstanceKey},
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
                      sop_instance_uid = EXCLUDED.sop_instance_uid,
                      instance_number = EXCLUDED.instance_number,
                      frame_index = EXCLUDED.frame_index,
                      image_index = EXCLUDED.image_index,
                      source_instance_key = EXCLUDED.source_instance_key,
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
                      sop_instance_uid,
                      instance_number,
                      frame_index,
                      image_index,
                      source_instance_key,
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

        await requireXCoreStudyReadAccess({ studyId, user: req.user, prismaClient: prisma });

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
        if (error?.status) {
            return handleAccessError(res, error);
        }
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

export const assignStudyPatient = async (req, res) => {
    try {
        const patientId = parseBigIntId(req.body?.patientId);
        if (!patientId) {
            return res.status(400).json({
                error: 'patientId is required',
                code: 'patient_id_required',
            });
        }

        const ownerAccess = await requireXCoreStudyOwner({
            studyId: req.params.id,
            user: req.user,
            prismaClient: prisma,
        });
        const relationship = await requireDentistPatientRelationship({
            dentistId: ownerAccess.userId,
            patientId,
            prismaClient: prisma,
        });

        if (ownerAccess.study.patientId === patientId) {
            return res.json({
                study: serializeJson({
                    id: ownerAccess.study.id,
                    patientId,
                    patient: relationship.patient,
                }),
                changed: false,
            });
        }

        const linkedCase = await prisma.specialistCase.findFirst({
            where: {
                xcoreStudyId: ownerAccess.study.id,
                patientId: { not: patientId },
            },
            select: { id: true },
        });
        if (linkedCase) {
            return res.status(409).json({
                error: 'This study is already linked to a Specialist Case for another patient',
                code: 'study_linked_to_specialist_case',
            });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const study = await tx.imagingStudy.update({
                where: { id: ownerAccess.study.id },
                data: { patientId },
                select: {
                    id: true,
                    patientId: true,
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone_number: true,
                        },
                    },
                },
            });
            await tx.imagingStudyPatientAssignment.create({
                data: {
                    studyId: ownerAccess.study.id,
                    previousPatientId: ownerAccess.study.patientId,
                    patientId,
                    assignedByDentistId: ownerAccess.userId,
                    source: 'manual',
                },
            });
            return study;
        });

        const invalidation = {
            io: req.app?.get?.('io'),
            eventName: 'xcore:study_updated',
            entity: 'imaging_study',
            entityId: ownerAccess.study.id,
            action: 'patient_assigned',
            dentistId: ownerAccess.userId,
        };
        emitPortalInvalidation({ ...invalidation, patientId });
        if (ownerAccess.study.patientId && ownerAccess.study.patientId !== patientId) {
            emitPortalInvalidation({ ...invalidation, patientId: ownerAccess.study.patientId });
        }

        return res.json({
            study: serializeJson(updated),
            changed: true,
        });
    } catch (error) {
        console.error('[X-Core] Assign study patient failed:', error.message);
        return handleAccessError(res, error);
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

        emitPortalInvalidation({
            io: req.app?.get?.('io'),
            eventName: 'xcore:study_updated',
            entity: 'imaging_study',
            entityId: studyId,
            action: 'deleted',
            patientId: study.patientId,
            dentistId: study.dentistId,
            clinicProfileId: study.clinicId,
        });

        res.json({ message: 'Study deleted successfully' });

    } catch (error) {
        console.error('Delete Study Error:', error);
        res.status(500).json({ error: 'Failed to delete study: ' + error.message });
    }
};

export const createStudyShare = async (req, res) => {
    try {
        const { id } = req.params;
        const recipientDentistId = req.body?.recipientDentistId || req.body?.recipient_dentist_id;
        const email = req.body?.email;

        if (!recipientDentistId && !email) {
            return res.status(400).json({ error: 'recipientDentistId or email is required' });
        }

        // Verify that the current user owns this study
        const ownerAccess = await requireXCoreStudyOwner({
            studyId: id,
            user: req.user,
            prismaClient: prisma,
        });

        let recipient;
        if (email) {
            // Share via email: look up dentist user globally in the system
            const recipientUser = await prisma.user.findUnique({
                where: { email: String(email).trim().toLowerCase() },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar_url: true,
                    roles: true,
                    clinicStaff: {
                        select: {
                            clinicProfileId: true,
                            assignedBranchId: true,
                        },
                    },
                    dentistProfile: {
                        select: {
                            title: true,
                            primarySpecialization: true,
                            clinic_id: true,
                        },
                        take: 1,
                    },
                }
            });

            if (!recipientUser || !recipientUser.roles.includes('dentist')) {
                return res.status(404).json({ error: 'Dentist with this email is not registered in the system' });
            }

            if (recipientUser.id === ownerAccess.userId) {
                return res.status(400).json({ error: 'You cannot share a study with yourself' });
            }

            recipient = recipientUser;
        } else {
            // Share via same-clinic dentist dropdown select
            const ownerClinicIds = await activeDentistClinicIds(ownerAccess.userId, { prismaClient: prisma });
            const studyClinicIds = clinicIdsForStudy(ownerAccess.study);
            const shareableClinicIds = studyClinicIds.length > 0
                ? ownerClinicIds.filter((clinicId) => clinicIdsIntersect([clinicId], studyClinicIds))
                : ownerClinicIds;

            if (shareableClinicIds.length === 0) {
                return res.status(403).json({ error: 'Only active clinic dentists can share X-Core studies with same-clinic dentists' });
            }

            recipient = await requireEligibleShareRecipient({
                recipientDentistId,
                clinicIds: shareableClinicIds,
                ownerDentistId: ownerAccess.userId,
                prismaClient: prisma,
            });
        }

        const existingShare = await prisma.studyDentistShare.findFirst({
            where: {
                studyId: ownerAccess.study.id,
                recipientDentistId: recipient.id,
            },
            select: { id: true },
        });

        const share = existingShare
            ? await prisma.studyDentistShare.update({
                where: { id: existingShare.id },
                data: {
                    ownerDentistId: ownerAccess.userId,
                    createdById: ownerAccess.userId,
                    revokedAt: null,
                },
            })
            : await prisma.studyDentistShare.create({
                data: {
                    studyId: ownerAccess.study.id,
                    ownerDentistId: ownerAccess.userId,
                    recipientDentistId: recipient.id,
                    createdById: ownerAccess.userId,
                },
            });

        res.json(serializeJson({
            share: {
                id: share.id,
                studyId: share.studyId,
                ownerDentistId: share.ownerDentistId,
                recipientDentistId: share.recipientDentistId,
                createdAt: share.createdAt,
                revokedAt: share.revokedAt,
                recipient: serializeEligibleDentist(recipient),
            },
        }));
    } catch (error) {
        if (error?.status) {
            return handleAccessError(res, error);
        }
        console.error('Create Study Share Error:', error);
        res.status(500).json({ error: error.message || 'Failed to create study share' });
    }
};

export const getEligibleStudyShareDentists = async (req, res) => {
    try {
        const shareScope = await shareableClinicIdsForOwnedStudy({
            studyId: req.params.id,
            user: req.user,
            prismaClient: prisma,
        });

        const dentists = await eligibleShareDentists({
            clinicIds: shareScope.clinicIds,
            ownerDentistId: shareScope.userId,
            prismaClient: prisma,
        });

        res.json({
            dentists: dentists.map(serializeEligibleDentist),
        });
    } catch (error) {
        if (error?.status) {
            return handleAccessError(res, error);
        }
        console.error('Get Eligible Study Share Dentists Error:', error);
        res.status(500).json({ error: 'Failed to load eligible dentists' });
    }
};

export const validateStudyShareToken = async (req, res) => {
    return res.status(410).json({
        error: 'Public X-Core share links are disabled. Ask the owning dentist to share with an active dentist in the same clinic.',
    });
};

export const getSharedStudy = async (req, res) => {
    return res.status(410).json({
        error: 'Public X-Core share links are disabled. Ask the owning dentist to share with an active dentist in the same clinic.',
    });
};

export const deleteBenchmarkStudy = async (req, res) => {
    try {
        if (process.env.XCORE_BENCHMARK_MODE !== 'true') {
            return res.status(403).json({ error: 'Benchmark mode is not enabled' });
        }

        const { id } = req.params;
        const studyId = BigInt(id);

        const study = await prisma.imagingStudy.findUnique({
            where: { id: studyId },
            include: { dentist: { include: { dentistProfile: true } } }
        });

        if (!study) {
            return res.status(404).json({ error: 'Study not found' });
        }

        // Security Check: Ensure the user owns this study
        if (study.dentistId !== BigInt(req.user.id)) {
            return res.status(403).json({ error: 'You do not have permission to delete this study' });
        }

        // Safety: Ensure it is a benchmark study
        const metadata = study.metadata || {};
        if (metadata.is_benchmark !== true) {
            return res.status(400).json({ error: 'Not a benchmark study' });
        }

        const runId = metadata.benchmark_run_id;
        logBackendEvent(runId, 'deletion_start', { studyId: id });

        // Calculate ACTUAL disk usage (includes VTI, thumbnails, generated images)
        let actualDiskSize = study.sizeInBytes || 0n;
        if (study.folderName) {
            const studyDir = path.join(UPLOAD_DIR, study.folderName);
            const diskSize = getDirSizeBytes(studyDir);
            if (diskSize > 0n) {
                actualDiskSize = diskSize;
            }
        }

        // Transaction: Delete DB record & Update Storage Usage
        await prisma.$transaction(async (tx) => {
            // Delete AI results for series
            const seriesIds = await tx.imagingSeries.findMany({
                where: { studyId },
                select: { id: true }
            });
            if (seriesIds.length > 0) {
                await tx.aIResult.deleteMany({
                    where: { seriesId: { in: seriesIds.map(s => s.id) } }
                });
            }

            // Delete series
            await tx.imagingSeries.deleteMany({
                where: { studyId }
            });

            // Delete Study
            await tx.imagingStudy.delete({
                where: { id: studyId }
            });

            // Decrement Storage Usage
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
                }
            }
        });

        // Delete Files from Disk (after DB success)
        if (study.folderName) {
            const studyDir = path.join(UPLOAD_DIR, study.folderName);
            // Safety Check: Ensure the path is strictly inside UPLOAD_DIR
            const resolvedPath = path.resolve(studyDir);
            const resolvedUploadDir = path.resolve(UPLOAD_DIR);
            if (resolvedPath.startsWith(resolvedUploadDir) && resolvedPath !== resolvedUploadDir) {
                if (fs.existsSync(studyDir)) {
                    fs.rmSync(studyDir, { recursive: true, force: true });
                    console.log(`[X-Core Benchmark] Deleted folder: ${studyDir}`);
                }
            } else {
                console.error(`[X-Core Benchmark] Safety violation: Attempted to delete directory outside uploads/x-core: ${studyDir}`);
                return res.status(400).json({ error: 'Invalid file path safety check failed' });
            }
        }

        logBackendEvent(runId, 'deletion_completed', { studyId: id });

        res.json({ success: true, message: 'Benchmark study and all associated files deleted successfully' });
    } catch (error) {
        console.error('[X-Core Benchmark] Delete Benchmark Study Error:', error);
        res.status(500).json({ error: 'Failed to delete benchmark study' });
    }
};

export const benchmarkCallback = async (req, res) => {
    try {
        if (process.env.XCORE_BENCHMARK_MODE !== 'true') {
            return res.status(403).json({ error: 'Benchmark mode is not enabled' });
        }
        const { runId, eventType, details } = req.body;
        if (!runId || !eventType) {
            return res.status(400).json({ error: 'runId and eventType are required' });
        }
        logBackendEvent(runId, eventType, details || {});
        res.json({ success: true });
    } catch (error) {
        console.error('[X-Core Benchmark] Callback Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
