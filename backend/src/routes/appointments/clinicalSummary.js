import express from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../../utils/tokens.js';
import {
  acknowledgeClinicalSummary,
  amendClinicalSummary,
  finalizeClinicalSummary,
  getClinicalSummary,
  saveClinicalSummaryDraft
} from '../../services/communications/clinicalSummaryService.js';
import { storeChatAttachment } from '../../services/communications/attachmentStorageService.js';

const router = express.Router();
const prisma = new PrismaClient();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      const error = new Error('UNSUPPORTED_FILE_TYPE');
      error.status = 400;
      return cb(error);
    }
    return cb(null, true);
  }
});

const attachmentUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'file too large' });
    }
    if (err.message === 'UNSUPPORTED_FILE_TYPE') {
      return res.status(400).json({ error: 'unsupported file type' });
    }
    console.error('Attachment upload error:', err);
    return res.status(500).json({ error: 'failed to upload attachment' });
  });
};

function sendClinicalSummaryError(res, error) {
  if (error.status === 403 || error.message === 'FORBIDDEN') {
    return res.status(403).json({ error: { code: 'CLINICAL_SUMMARY_FORBIDDEN' } });
  }
  if (error.status === 404 || error.message === 'APPOINTMENT_NOT_FOUND') {
    return res.status(404).json({ error: { code: 'APPOINTMENT_NOT_FOUND' } });
  }
  if (error.status === 409 || error.message === 'SUMMARY_FINALIZED' || error.message === 'SUMMARY_NOT_FINALIZED') {
    return res.status(409).json({ error: { code: error.message } });
  }
  if (error.status === 400 || error.message === 'SUMMARY_VALIDATION_FAILED') {
    return res.status(400).json({
      error: {
        code: error.message,
        details: error.details || null
      }
    });
  }
  console.error('Clinical summary route error:', error);
  return res.status(500).json({ error: { code: 'CLINICAL_SUMMARY_FAILED' } });
}

router.get(
  '/:appointmentId/clinical-summary',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await getClinicalSummary({
        appointmentId: req.params.appointmentId,
        user: req.user
      });
      return res.json(result);
    } catch (error) {
      return sendClinicalSummaryError(res, error);
    }
  }
);

router.put(
  '/:appointmentId/clinical-summary/draft',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await saveClinicalSummaryDraft({
        appointmentId: req.params.appointmentId,
        user: req.user,
        input: req.body || {}
      });
      return res.json(result);
    } catch (error) {
      return sendClinicalSummaryError(res, error);
    }
  }
);

router.post(
  '/:appointmentId/clinical-summary/finalize',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await finalizeClinicalSummary({
        appointmentId: req.params.appointmentId,
        user: req.user,
        input: req.body || {}
      });
      return res.json(result);
    } catch (error) {
      return sendClinicalSummaryError(res, error);
    }
  }
);

router.post(
  '/:appointmentId/clinical-summary/amend',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await amendClinicalSummary({
        appointmentId: req.params.appointmentId,
        user: req.user,
        input: req.body || {}
      });
      return res.json(result);
    } catch (error) {
      return sendClinicalSummaryError(res, error);
    }
  }
);

router.post(
  '/:appointmentId/clinical-summary/acknowledge',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await acknowledgeClinicalSummary({
        appointmentId: req.params.appointmentId,
        user: req.user
      });
      return res.json(result);
    } catch (error) {
      return sendClinicalSummaryError(res, error);
    }
  }
);

router.post(
  '/:appointmentId/clinical-summary/attachments',
  authenticateToken,
  attachmentUpload,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'file is required' });
      }

      // Authorize access
      const appointment = await prisma.appointment.findUnique({
        where: { id: BigInt(appointmentId) }
      });
      if (!appointment) {
        return res.status(404).json({ error: { code: 'APPOINTMENT_NOT_FOUND' } });
      }
      if (req.user.role !== 'admin' && (req.user.role !== 'dentist' || appointment.dentistId !== req.user.id)) {
        return res.status(403).json({ error: { code: 'CLINICAL_SUMMARY_FORBIDDEN' } });
      }

      const stored = await storeChatAttachment({ appointmentId: appointment.id, file });
      return res.json({
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        fileSizeBytes: stored.fileSizeBytes,
        storageProvider: stored.storageProvider,
        storageBucket: stored.storageBucket,
        storageObjectKey: stored.storageObjectKey,
        mediaRetentionUntil: stored.mediaRetentionUntil,
        mediaScanStatus: stored.mediaScanStatus,
        metadata: stored.metadata
      });
    } catch (error) {
      return sendClinicalSummaryError(res, error);
    }
  }
);

export default router;
