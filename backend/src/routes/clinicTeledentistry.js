import express from 'express';
import { authenticateToken } from '../utils/tokens.js';
import {
  countClinicTeledentistrySessions,
  getClinicTeledentistryMessages,
  getClinicTeledentistrySummary,
  listClinicCommunicationAudit,
  listClinicTeledentistrySessions
} from '../services/clinicTeledentistryService.js';

const router = express.Router();

function sendClinicTeleError(res, error, fallback = 'CLINIC_TELEDENTISTRY_FAILED') {
  if (error.status === 400) {
    return res.status(400).json({ error: { code: error.message } });
  }
  if (error.status === 403 || error.message === 'FORBIDDEN') {
    return res.status(403).json({ error: { code: 'CLINIC_TELEDENTISTRY_FORBIDDEN' } });
  }
  if (error.status === 404 || error.message === 'APPOINTMENT_NOT_FOUND') {
    return res.status(404).json({ error: { code: 'APPOINTMENT_NOT_FOUND' } });
  }
  console.error('Clinic teledentistry route error:', error);
  return res.status(500).json({ error: { code: fallback } });
}

router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const result = await listClinicTeledentistrySessions({
      user: req.user,
      date: req.query.date,
      status: req.query.status
    });
    return res.json(result);
  } catch (error) {
    return sendClinicTeleError(res, error, 'CLINIC_TELEDENTISTRY_SESSIONS_FAILED');
  }
});

router.get('/sessions/count', authenticateToken, async (req, res) => {
  try {
    const result = await countClinicTeledentistrySessions({
      user: req.user,
      status: req.query.status
    });
    return res.json(result);
  } catch (error) {
    return sendClinicTeleError(res, error, 'CLINIC_TELEDENTISTRY_SESSION_COUNT_FAILED');
  }
});

router.get('/appointments/:appointmentId/summary', authenticateToken, async (req, res) => {
  try {
    const result = await getClinicTeledentistrySummary({
      user: req.user,
      appointmentId: req.params.appointmentId
    });
    return res.json(result);
  } catch (error) {
    return sendClinicTeleError(res, error, 'CLINIC_TELEDENTISTRY_SUMMARY_FAILED');
  }
});

router.get('/appointments/:appointmentId/messages', authenticateToken, async (req, res) => {
  try {
    const result = await getClinicTeledentistryMessages({
      user: req.user,
      appointmentId: req.params.appointmentId,
      limit: req.query.limit
    });
    return res.json(result);
  } catch (error) {
    return sendClinicTeleError(res, error, 'CLINIC_TELEDENTISTRY_MESSAGES_FAILED');
  }
});

router.get('/audit-log', authenticateToken, async (req, res) => {
  try {
    const result = await listClinicCommunicationAudit({
      user: req.user,
      date: req.query.date,
      eventType: req.query.eventType,
      dentistId: req.query.dentistId,
      limit: req.query.limit
    });
    return res.json(result);
  } catch (error) {
    return sendClinicTeleError(res, error, 'CLINIC_TELEDENTISTRY_AUDIT_FAILED');
  }
});

export default router;
