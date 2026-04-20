import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '../../uploads/x-core');
const PY_SERVICE_BASE_URL = process.env.XCORE_PY_API_BASE_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';
const ALLOWED_SHARE_EXPIRY_HOURS = new Set([24, 48, 72, 168]);

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
