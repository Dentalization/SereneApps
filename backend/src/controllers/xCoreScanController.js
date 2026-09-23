import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import {
  normalizePatientPhone,
  withPatientIdentityTransaction,
  findPatientByIdentity,
} from '../services/patients/patientIdentityResolver.js';

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
 * Create a new 3D scan session record linked to a patient.
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
          status: 'pending_capture',
          sizeInBytes: 0n,
          metadata: {
            ...metadata,
            scanScope,
            scanIdentifier,
            captureMode: 'continuous_rgb',
            notes: notes || null,
            createdVia: 'dentist_mobile_mvp',
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
        createdAt: scan.createdAt.toISOString(),
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
 * Upload raw continuous smartphone RGB video for an existing 3D scan session.
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

    const currentMetadata = (typeof scan.metadata === 'object' && scan.metadata) ? scan.metadata : {};
    const updatedMetadata = {
      ...currentMetadata,
      videoFileName: targetVideoFileName,
      videoMimeType: req.file.mimetype,
      videoSizeInBytes: Number(videoSize),
      durationMs,
      resolution,
      fps,
      capturedAt: new Date().toISOString(),
      preservedOriginal: true,
      captureMode: 'continuous_rgb',
    };

    const updatedScan = await prisma.imagingStudy.update({
      where: { id: scan.id },
      data: {
        status: 'captured',
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
          capturedAt: updatedMetadata.capturedAt,
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

