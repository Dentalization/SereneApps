import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import {
  normalizePatientPhone,
  withPatientIdentityTransaction,
  findPatientByIdentity,
} from '../services/patients/patientIdentityResolver.js';
import { enqueueScan, getScanJobStatus, retryScan } from '../services/scan3D/scan3DQueueService.js';
import { processScanNow } from '../services/scan3D/scan3DWorker.js';
import { reconstructionEngineRegistry } from '../services/scan3D/engines/reconstructionEngineRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const XCORE_UPLOAD_DIR = path.join(__dirname, '../../uploads/x-core');

const prisma = new PrismaClient();

function parseBigIntId(value) {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function serializeJson(payload) {
  return JSON.parse(
    JSON.stringify(payload, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

/**
 * GET /v1/x-core/3d-scans/patients
 * List accessible patients for the authenticated dentist, with optional search query.
 */
export const getScanPatients = async (req, res) => {
  try {
    const dentistId = parseBigIntId(req.user?.id);
    if (!dentistId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { search = '', limit = 20 } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const searchTrimmed = String(search || '').trim().toLowerCase();

    // Find patient IDs associated with this dentist from appointments or imaging studies
    const [appointmentPatients, studyPatients] = await Promise.all([
      prisma.appointment.findMany({
        where: { dentistId },
        select: { patientId: true },
        distinct: ['patientId'],
      }),
      prisma.imagingStudy.findMany({
        where: { dentistId, patientId: { not: null } },
        select: { patientId: true },
        distinct: ['patientId'],
      }),
    ]);

    const associatedPatientIds = Array.from(
      new Set(
        [
          ...appointmentPatients.map((a) => a.patientId),
          ...studyPatients.map((s) => s.patientId),
        ].filter(Boolean)
      )
    );

    let whereClause = {
      roles: { has: 'patient' },
    };

    if (searchTrimmed) {
      whereClause.OR = [
        { name: { contains: searchTrimmed, mode: 'insensitive' } },
        { phone_number: { contains: searchTrimmed } },
        { email: { contains: searchTrimmed, mode: 'insensitive' } },
      ];
    } else if (associatedPatientIds.length > 0) {
      whereClause.id = { in: associatedPatientIds };
    }

    const patients = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone_number: true,
        createdAt: true,
        patientProfile: {
          select: {
            dateOfBirth: true,
            gender: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parsedLimit,
    });

    const serialized = patients.map((p) => ({
      id: p.id.toString(),
      name: p.name || 'Tanpa Nama',
      email: p.email?.endsWith('@serene.local') ? null : p.email,
      phone: p.phone_number,
      mrn: `MRN-${p.id.toString().padStart(6, '0')}`,
      gender: p.patientProfile?.gender || null,
      createdAt: p.createdAt?.toISOString(),
    }));

    return res.json({ patients: serialized });
  } catch (error) {
    console.error('[xCoreScanController] getScanPatients error:', error);
    return res.status(500).json({ error: 'Failed to fetch scan patients' });
  }
};

/**
 * POST /v1/x-core/3d-scans/patients
 * Create or resolve a patient specifically for a 3D scan session.
 */
export const createScanPatient = async (req, res) => {
  try {
    const dentistId = parseBigIntId(req.user?.id);
    if (!dentistId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { name, phone, email, gender, dateOfBirth } = req.body || {};
    const normalizedName = String(name || '').trim();
    const normalizedPhone = normalizePatientPhone(phone);
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;

    if (!normalizedName) {
      return res.status(400).json({ error: 'Nama pasien wajib diisi', code: 'PATIENT_NAME_REQUIRED' });
    }

    if (!normalizedPhone && !normalizedEmail) {
      return res.status(400).json({ error: 'Nomor telepon pasien wajib diisi', code: 'PATIENT_PHONE_REQUIRED' });
    }

    const patient = await withPatientIdentityTransaction(prisma, async (tx) => {
      let user = await findPatientByIdentity(tx, {
        email: normalizedEmail,
        phone: normalizedPhone,
      });

      if (!user) {
        if (normalizedEmail) {
          const emailOwner = await tx.user.findUnique({ where: { email: normalizedEmail } });
          if (emailOwner) {
            const conflict = new Error('Email sudah digunakan oleh akun lain');
            conflict.status = 409;
            conflict.code = 'EMAIL_ALREADY_USED';
            throw conflict;
          }
        }

        const passwordHash = await bcrypt.hash(randomUUID(), 10);
        user = await tx.user.create({
          data: {
            name: normalizedName,
            email: normalizedEmail || `patient+${randomUUID()}@serene.local`,
            password_hash: passwordHash,
            phone_number: normalizedPhone || null,
            roles: ['patient'],
            patientProfile: {
              create: {
                gender: gender || null,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
              },
            },
          },
          include: { patientProfile: true },
        });
      } else {
        const identityUpdates = {};
        if (!user.name && normalizedName) identityUpdates.name = normalizedName;
        if (!user.phone_number && normalizedPhone) identityUpdates.phone_number = normalizedPhone;
        if (Object.keys(identityUpdates).length) {
          user = await tx.user.update({
            where: { id: user.id },
            data: identityUpdates,
            include: { patientProfile: true },
          });
        }
      }

      return user;
    });

    return res.status(201).json({
      patient: {
        id: patient.id.toString(),
        name: patient.name,
        email: patient.email?.endsWith('@serene.local') ? null : patient.email,
        phone: patient.phone_number,
        mrn: `MRN-${patient.id.toString().padStart(6, '0')}`,
        gender: patient.patientProfile?.gender || null,
        createdAt: patient.createdAt?.toISOString(),
      },
    });
  } catch (error) {
    if (error.status === 409 || error.code === 'EMAIL_ALREADY_USED') {
      return res.status(409).json({ error: error.message, code: error.code });
    }
    console.error('[xCoreScanController] createScanPatient error:', error);
    return res.status(500).json({ error: 'Failed to create scan patient' });
  }
};

/**
 * POST /v1/x-core/3d-scans
 * Create a new 3D scan session record linked to a patient with status 'created'.
 */
export const create3DScan = async (req, res) => {
  try {
    const dentistId = parseBigIntId(req.user?.id);
    if (!dentistId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { patientId, scanScope = 'full', notes = null, metadata = {} } = req.body || {};
    const parsedPatientId = parseBigIntId(patientId);

    if (!parsedPatientId) {
      return res.status(400).json({ error: 'patientId is required and must be valid', code: 'PATIENT_ID_REQUIRED' });
    }

    // Verify patient exists and has patient role
    const patient = await prisma.user.findFirst({
      where: { id: parsedPatientId, roles: { has: 'patient' } },
      select: { id: true, name: true, phone_number: true, email: true },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found', code: 'PATIENT_NOT_FOUND' });
    }

    // Check dentist clinic affiliation
    let uploadClinicId = null;
    const dentistProfile = await prisma.dentistProfile.findFirst({
      where: { userId: dentistId },
      select: { clinic_id: true },
    });
    if (dentistProfile?.clinic_id) {
      uploadClinicId = dentistProfile.clinic_id;
    } else if (req.user?.clinicStaff?.isActive && req.user.clinicStaff.clinicProfileId) {
      uploadClinicId = BigInt(req.user.clinicStaff.clinicProfileId);
    }

    // Generate unique scan identifier
    const scanIdentifier = `SCAN-3D-${Date.now()}-${randomUUID().slice(0, 8)}`;

    const scanStudy = await prisma.$transaction(async (tx) => {
      const study = await tx.imagingStudy.create({
        data: {
          patientId: parsedPatientId,
          dentistId,
          clinicId: uploadClinicId,
          studyDate: new Date(),
          modality: '3D_SCAN',
          folderName: scanIdentifier,
          originalName: `Dental 3D Scan - ${patient.name}`,
          description: `Smartphone Dental 3D Scan (${scanScope.toUpperCase()})`,
          status: 'created',
          sizeInBytes: 0n,
          metadata: {
            ...metadata,
            scanScope,
            scanIdentifier,
            captureMode: 'continuous_rgb',
            notes: notes || null,
            createdVia: 'dentist_mobile_scan',
            legacyStatus: 'pending_capture',
          },
        },
      });

      await tx.imagingStudyPatientAssignment.create({
        data: {
          studyId: study.id,
          previousPatientId: null,
          patientId: parsedPatientId,
          assignedByDentistId: dentistId,
          source: 'upload',
        },
      });

      return study;
    });

    return res.status(201).json({
      scan: {
        id: scanStudy.id.toString(),
        scanIdentifier: scanStudy.folderName,
        patientId: scanStudy.patientId?.toString(),
        dentistId: scanStudy.dentistId?.toString(),
        clinicId: scanStudy.clinicId ? scanStudy.clinicId.toString() : null,
        status: scanStudy.status,
        scanScope,
        createdAt: scanStudy.createdAt.toISOString(),
        patient: {
          id: patient.id.toString(),
          name: patient.name,
          phone: patient.phone_number,
          email: patient.email?.endsWith('@serene.local') ? null : patient.email,
        },
      },
    });
  } catch (error) {
    console.error('[xCoreScanController] create3DScan error:', error);
    return res.status(500).json({ error: 'Failed to create 3D scan session' });
  }
};

/**
 * GET /v1/x-core/3d-scans/:id
 * Retrieve details of a specific 3D scan session.
 */
export const get3DScanDetails = async (req, res) => {
  try {
    const dentistId = parseBigIntId(req.user?.id);
    if (!dentistId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const scanId = parseBigIntId(req.params.id);
    if (!scanId) {
      return res.status(400).json({ error: 'Invalid scan ID' });
    }

    const scan = await prisma.imagingStudy.findFirst({
      where: {
        id: scanId,
        modality: '3D_SCAN',
        OR: [
          { dentistId },
          { dentistShares: { some: { recipientDentistId: dentistId, revokedAt: null } } },
        ],
      },
      include: {
        patient: {
          select: { id: true, name: true, phone_number: true, email: true },
        },
      },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan session not found or unauthorized' });
    }

    return res.json({
      scan: {
        id: scan.id.toString(),
        scanIdentifier: scan.folderName,
        patientId: scan.patientId?.toString() || null,
        dentistId: scan.dentistId?.toString() || null,
        clinicId: scan.clinicId ? scan.clinicId.toString() : null,
        status: scan.status,
        scanScope: scan.metadata?.scanScope || 'full',
        sizeInBytes: scan.sizeInBytes.toString(),
        createdAt: scan.createdAt.toISOString(),
        metadata: scan.metadata || {},
        lidra: scan.metadata?.lidra || null,
        confidence: scan.metadata?.confidence || null,
        assets: scan.metadata?.assets || null,
        patient: scan.patient
          ? {
              id: scan.patient.id.toString(),
              name: scan.patient.name,
              phone: scan.patient.phone_number,
              email: scan.patient.email?.endsWith('@serene.local') ? null : scan.patient.email,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('[xCoreScanController] get3DScanDetails error:', error);
    return res.status(500).json({ error: 'Failed to fetch scan details' });
  }
};

/**
 * POST /v1/x-core/3d-scans/:id/video
 * Non-blocking continuous smartphone RGB video upload.
 * Persists raw video to disk, extracts metadata, sets status to 'uploaded',
 * and optionally enqueues for async processing without holding connection.
 */
export const upload3DScanVideo = async (req, res) => {
  try {
    const dentistId = parseBigIntId(req.user?.id);
    if (!dentistId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const scanId = parseBigIntId(req.params.id);
    if (!scanId) {
      return res.status(400).json({ error: 'Invalid scan ID' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    const scan = await prisma.imagingStudy.findFirst({
      where: {
        id: scanId,
        modality: '3D_SCAN',
        OR: [
          { dentistId },
          { dentistShares: { some: { recipientDentistId: dentistId, revokedAt: null } } },
        ],
      },
      include: {
        patient: {
          select: { id: true, name: true, phone_number: true, email: true },
        },
      },
    });

    if (!scan) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(404).json({ error: 'Scan session not found or unauthorized' });
    }

    // Do not allow re-upload if currently processing
    if (scan.status === 'processing') {
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(409).json({ error: 'Scan is currently undergoing 3D reconstruction' });
    }

    const mime = req.file.mimetype || '';
    if (!mime.startsWith('video/') && !req.file.originalname?.match(/\.(mp4|mov|m4v|webm)$/i)) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(400).json({ error: 'Uploaded file must be a valid video format' });
    }

    const studyDir = path.join(XCORE_UPLOAD_DIR, scan.folderName || `SCAN-3D-${scan.id}`);
    if (!fs.existsSync(studyDir)) {
      fs.mkdirSync(studyDir, { recursive: true });
    }

    const ext = path.extname(req.file.originalname) || '.mp4';
    const targetVideoFileName = `raw_video${ext}`;
    const targetVideoPath = path.join(studyDir, targetVideoFileName);

    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.copyFileSync(req.file.path, targetVideoPath);
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
    } else if (req.file.buffer) {
      fs.writeFileSync(targetVideoPath, req.file.buffer);
    }

    const videoSize = BigInt(req.file.size || fs.statSync(targetVideoPath).size);
    const durationMs = req.body?.durationMs ? parseInt(req.body.durationMs, 10) : null;
    const resolution = req.body?.resolution || '1080p';
    const fps = req.body?.fps ? parseInt(req.body.fps, 10) : 30;

    // Compute file hash for integrity check
    let checksum = null;
    try {
      const fileBuffer = fs.readFileSync(targetVideoPath);
      checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (e) {
      console.warn('[xCoreScanController] Checksum calculation error:', e);
    }

    const currentMetadata = (typeof scan.metadata === 'object' && scan.metadata) ? scan.metadata : {};
    const updatedMetadata = {
      ...currentMetadata,
      videoFileName: targetVideoFileName,
      videoMimeType: req.file.mimetype,
      videoSizeInBytes: Number(videoSize),
      checksum,
      durationMs,
      resolution,
      fps,
      uploadedAt: new Date().toISOString(),
      capturedAt: currentMetadata.capturedAt || new Date().toISOString(),
      preservedOriginal: true,
      captureMode: 'continuous_rgb',
    };

    const autoQueue = req.body?.autoQueue === 'true' || req.query?.autoQueue === 'true';
    const targetStatus = autoQueue ? 'queued' : 'uploaded';

    if (autoQueue) {
      updatedMetadata.processingJob = {
        jobId: `job-3d-${Date.now()}-${randomUUID().slice(0, 8)}`,
        status: 'queued',
        queuedAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        failedAt: null,
        attempts: 0,
        maxAttempts: 3,
        progressPercent: 5,
        currentStage: 'queued',
        reconstructionEngine: 'photogrammetry_v1',
        logs: [
          {
            timestamp: new Date().toISOString(),
            stage: 'upload_autoqueue',
            level: 'info',
            message: 'Video uploaded and automatically queued for 3D reconstruction',
          },
        ],
      };
    }

    const updatedScan = await prisma.imagingStudy.update({
      where: { id: scan.id },
      data: {
        status: targetStatus,
        sizeInBytes: videoSize,
        metadata: updatedMetadata,
      },
      include: {
        patient: {
          select: { id: true, name: true, phone_number: true, email: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Video 3D scan berhasil diunggah',
      scan: {
        id: updatedScan.id.toString(),
        scanIdentifier: updatedScan.folderName,
        status: updatedScan.status,
        legacyStatus: 'captured',
        patientId: updatedScan.patientId?.toString() || null,
        dentistId: updatedScan.dentistId?.toString() || null,
        scanScope: updatedMetadata.scanScope || 'full',
        sizeInBytes: updatedScan.sizeInBytes.toString(),
        createdAt: updatedScan.createdAt.toISOString(),
        video: {
          fileName: targetVideoFileName,
          sizeInBytes: Number(videoSize),
          durationMs,
          resolution,
          fps,
          checksum,
          uploadedAt: updatedMetadata.uploadedAt,
        },
        patient: updatedScan.patient
          ? {
              id: updatedScan.patient.id.toString(),
              name: updatedScan.patient.name,
              phone: updatedScan.patient.phone_number,
              email: updatedScan.patient.email?.endsWith('@serene.local') ? null : updatedScan.patient.email,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('[xCoreScanController] upload3DScanVideo error:', error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    return res.status(500).json({ error: 'Failed to upload 3D scan video' });
  }
};

/**
 * POST /v1/x-core/3d-scans/:id/queue
 * Enqueue a scan for asynchronous 3D reconstruction.
 */
export const enqueue3DScan = async (req, res) => {
  try {
    const dentistId = parseBigIntId(req.user?.id);
    if (!dentistId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const scanId = parseBigIntId(req.params.id);
    if (!scanId) {
      return res.status(400).json({ error: 'Invalid scan ID' });
    }

    // Verify study authorization
    const scan = await prisma.imagingStudy.findFirst({
      where: {
        id: scanId,
        modality: '3D_SCAN',
        OR: [
          { dentistId },
          { dentistShares: { some: { recipientDentistId: dentistId, revokedAt: null } } },
        ],
      },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan session not found or unauthorized' });
    }

    const { scan: updatedScan, job } = await enqueueScan(scan.id, req.body || {});

    // If immediate processing requested (e.g. test or explicit fast run)
    if (req.body?.immediate) {
      processScanNow(scan.id).catch((err) => {
        console.error('[xCoreScanController] immediate processScanNow error:', err);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Scan berhasil dimasukkan ke dalam antrean rekonstruksi 3D',
      scan: {
        id: updatedScan.id.toString(),
        scanIdentifier: updatedScan.folderName,
        status: updatedScan.status,
      },
      job,
    });
  } catch (error) {
    console.error('[xCoreScanController] enqueue3DScan error:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Failed to enqueue 3D scan' });
  }
};

/**
 * GET /v1/x-core/3d-scans/:id/status
 * Polling endpoint for real-time asynchronous reconstruction progress.
 */
export const get3DScanStatus = async (req, res) => {
  try {
    const dentistId = parseBigIntId(req.user?.id);
    if (!dentistId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const scanId = parseBigIntId(req.params.id);
    if (!scanId) {
      return res.status(400).json({ error: 'Invalid scan ID' });
    }

    // Verify authorization
    const scan = await prisma.imagingStudy.findFirst({
      where: {
        id: scanId,
        modality: '3D_SCAN',
        OR: [
          { dentistId },
          { dentistShares: { some: { recipientDentistId: dentistId, revokedAt: null } } },
        ],
      },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan session not found or unauthorized' });
    }

    const statusData = await getScanJobStatus(scan.id);
    return res.status(200).json({
      success: true,
      ...statusData,
    });
  } catch (error) {
    console.error('[xCoreScanController] get3DScanStatus error:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Failed to get scan status' });
  }
};

/**
 * POST /v1/x-core/3d-scans/:id/retry
 * Retry a failed 3D reconstruction session.
 */
export const retry3DScan = async (req, res) => {
  try {
    const dentistId = parseBigIntId(req.user?.id);
    if (!dentistId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const scanId = parseBigIntId(req.params.id);
    if (!scanId) {
      return res.status(400).json({ error: 'Invalid scan ID' });
    }

    const scan = await prisma.imagingStudy.findFirst({
      where: {
        id: scanId,
        modality: '3D_SCAN',
        OR: [
          { dentistId },
          { dentistShares: { some: { recipientDentistId: dentistId, revokedAt: null } } },
        ],
      },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan session not found or unauthorized' });
    }

    const { scan: updatedScan, job } = await retryScan(scan.id, req.body || {});

    return res.status(200).json({
      success: true,
      message: 'Sesi scan berhasil dijadwalkan ulang untuk rekonstruksi',
      scan: {
        id: updatedScan.id.toString(),
        scanIdentifier: updatedScan.folderName,
        status: updatedScan.status,
      },
      job,
    });
  } catch (error) {
    console.error('[xCoreScanController] retry3DScan error:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Failed to retry scan' });
  }
};

/**
 * GET /v1/x-core/3d-scans/:id/assets/:fileName
 * Serves generated 3D assets (mesh.obj, mesh.ply, preview.png, reconstruction_report.json)
 * with strict directory traversal prevention and appropriate MIME types.
 */
export const get3DScanAsset = async (req, res) => {
  try {
    const dentistId = parseBigIntId(req.user?.id);
    if (!dentistId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const scanId = parseBigIntId(req.params.id);
    const rawFileName = req.params.fileName;

    if (!scanId || !rawFileName) {
      return res.status(400).json({ error: 'Invalid scan ID or file name' });
    }

    // Sanitize filename to prevent directory traversal
    const safeFileName = path.basename(rawFileName);
    const allowedExtensions = ['.obj', '.ply', '.stl', '.glb', '.gltf', '.png', '.jpg', '.jpeg', '.json', '.mtl', '.mp4'];
    const ext = path.extname(safeFileName).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'File type not permitted' });
    }

    const scan = await prisma.imagingStudy.findFirst({
      where: {
        id: scanId,
        modality: '3D_SCAN',
        OR: [
          { dentistId },
          { dentistShares: { some: { recipientDentistId: dentistId, revokedAt: null } } },
        ],
      },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan session not found or unauthorized' });
    }

    const folderName = scan.folderName || `SCAN-3D-${scan.id}`;
    const filePath = path.join(XCORE_UPLOAD_DIR, folderName, safeFileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Requested 3D asset not found' });
    }

    // Set MIME types
    const mimeMap = {
      '.obj': 'model/obj',
      '.stl': 'model/stl',
      '.glb': 'model/gltf-binary',
      '.gltf': 'model/gltf+json',
      '.ply': 'application/octet-stream',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.json': 'application/json',
      '.mtl': 'model/mtl',
      '.mp4': 'video/mp4',
    };

    res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache static mesh assets
    return res.sendFile(filePath);
  } catch (error) {
    console.error('[xCoreScanController] get3DScanAsset error:', error);
    return res.status(500).json({ error: 'Failed to retrieve 3D asset' });
  }
};

/**
 * GET /v1/x-core/3d-scans/engines
 * Lists all registered 3D reconstruction engines and their capabilities.
 */
export const get3DScanEngines = async (req, res) => {
  try {
    const dentistId = parseBigIntId(req.user?.id);
    if (!dentistId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const engines = reconstructionEngineRegistry.list();
    return res.status(200).json({
      success: true,
      defaultEngine: 'photogrammetry_v1',
      engines,
    });
  } catch (error) {
    console.error('[xCoreScanController] get3DScanEngines error:', error);
    return res.status(500).json({ error: 'Failed to list reconstruction engines' });
  }
};

/**
 * GET /v1/x-core/3d-scans/:id/lidra
 * Retrieves the LIDRA acquisition analysis report for a 3D scan session.
 */
export const get3DScanLidraReport = async (req, res) => {
  try {
    const dentistId = parseBigIntId(req.user?.id);
    if (!dentistId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const scanId = parseBigIntId(req.params.id);
    if (!scanId) {
      return res.status(400).json({ error: 'Invalid scan ID' });
    }

    const scan = await prisma.imagingStudy.findFirst({
      where: {
        id: scanId,
        modality: '3D_SCAN',
        OR: [
          { dentistId },
          { dentistShares: { some: { recipientDentistId: dentistId, revokedAt: null } } },
        ],
      },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan session not found or unauthorized' });
    }

    const folderName = scan.folderName || `SCAN-3D-${scan.id}`;
    const reportPath = path.join(XCORE_UPLOAD_DIR, folderName, 'lidra_analysis.json');

    let lidraReport = scan.metadata?.lidra || null;
    if (fs.existsSync(reportPath)) {
      try {
        lidraReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      } catch {}
    }

    if (!lidraReport) {
      return res.status(404).json({ error: 'LIDRA acquisition report not yet generated' });
    }

    return res.status(200).json({
      success: true,
      scanId: scan.id.toString(),
      scanIdentifier: scan.folderName,
      lidra: lidraReport,
    });
  } catch (error) {
    console.error('[xCoreScanController] get3DScanLidraReport error:', error);
    return res.status(500).json({ error: 'Failed to retrieve LIDRA acquisition report' });
  }
};

// ---------------------------------------------------------------------------
// Phase 12 — Tooth Segmentation & FDI
// ---------------------------------------------------------------------------

const PY_SERVICE_BASE_URL = process.env.PY_SERVICE_BASE_URL || 'http://127.0.0.1:8000';

/**
 * GET /v1/x-core/3d-scans/:id/tooth-instances
 * Return cached tooth segmentation for a scan.
 * Tries disk cache (tooth_instances.json) first, then proxies to Python service.
 */
export const get3DScanToothInstances = async (req, res) => {
  try {
    const dentistId = parseBigIntId(req.user?.id);
    if (!dentistId) return res.status(401).json({ error: 'Authentication required' });

    const scanId = parseBigIntId(req.params.id);
    if (!scanId) return res.status(400).json({ error: 'Invalid scan ID' });

    const scan = await prisma.imagingStudy.findFirst({
      where: { id: scanId, modality: '3D_SCAN', dentistId },
    });
    if (!scan) return res.status(404).json({ error: '3D scan not found' });

    const folderName = scan.folderName || `SCAN-3D-${scan.id}`;
    const studyDir = path.join(XCORE_UPLOAD_DIR, folderName);
    const cachePath = path.join(studyDir, 'tooth_instances.json');

    // 1. Disk cache hit — fast path
    if (fs.existsSync(cachePath)) {
      try {
        const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        return res.status(200).json(serializeJson({ success: true, ...cached }));
      } catch {
        // corrupt cache — fall through to Python
      }
    }

    // 2. Python service proxy
    try {
      const pyResp = await fetch(`${PY_SERVICE_BASE_URL}/segment/tooth-instances/${encodeURIComponent(folderName)}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (pyResp.ok) {
        const pyData = await pyResp.json();
        return res.status(200).json(serializeJson({ success: true, ...pyData }));
      }
      if (pyResp.status === 404) {
        return res.status(404).json({
          error: 'Tooth instances not yet computed',
          hint: 'POST to /tooth-instances/segment to trigger segmentation',
        });
      }
    } catch (pyErr) {
      console.warn('[xCoreScanController] Python tooth-instances unavailable:', pyErr.message);
    }

    return res.status(404).json({
      error: 'Tooth instances not available',
      hint: 'POST to /tooth-instances/segment to trigger segmentation',
    });
  } catch (error) {
    console.error('[xCoreScanController] get3DScanToothInstances error:', error);
    return res.status(500).json({ error: 'Failed to retrieve tooth instances' });
  }
};

/**
 * POST /v1/x-core/3d-scans/:id/tooth-instances/segment
 * Trigger on-demand tooth segmentation for a scan.
 */
export const trigger3DScanSegmentation = async (req, res) => {
  try {
    const dentistId = parseBigIntId(req.user?.id);
    if (!dentistId) return res.status(401).json({ error: 'Authentication required' });

    const scanId = parseBigIntId(req.params.id);
    if (!scanId) return res.status(400).json({ error: 'Invalid scan ID' });

    const scan = await prisma.imagingStudy.findFirst({
      where: { id: scanId, modality: '3D_SCAN', dentistId },
      include: { patient: { select: { id: true } } },
    });
    if (!scan) return res.status(404).json({ error: '3D scan not found' });
    if (scan.status !== 'ready') {
      return res.status(409).json({ error: `Scan is not ready for segmentation (status: ${scan.status})` });
    }

    const folderName = scan.folderName || `SCAN-3D-${scan.id}`;

    // Proxy to Python service — non-blocking (respond 202 immediately)
    res.status(202).json({
      success: true,
      message: 'Tooth segmentation triggered',
      scanId: scan.id.toString(),
      folderName,
      pollUrl: `/v1/x-core/3d-scans/${scan.id}/tooth-instances`,
    });

    // Fire-and-forget to Python
    try {
      const pyResp = await fetch(`${PY_SERVICE_BASE_URL}/segment/tooth-instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName,
          scanId: scan.id.toString(),
          patientId: scan.patient?.id?.toString() || '',
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!pyResp.ok) {
        console.warn(`[xCoreScanController] Python segmentation returned ${pyResp.status} for scan ${scan.id}`);
      }
    } catch (pyErr) {
      console.warn('[xCoreScanController] Python tooth segmentation fire-and-forget error:', pyErr.message);
    }
  } catch (error) {
    console.error('[xCoreScanController] trigger3DScanSegmentation error:', error);
    // Response may already be sent — log only
  }
};

