import express from 'express';
import { authenticateToken } from '../../utils/tokens.js';
import {
  amendClinicalSummary,
  finalizeClinicalSummary,
  getClinicalSummary,
  saveClinicalSummaryDraft
} from '../../services/communications/clinicalSummaryService.js';

const router = express.Router();

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

export default router;
