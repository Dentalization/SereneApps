import express from 'express';
import { authenticateToken, requireRoles } from '../../utils/tokens.js';
import {
  getAppointmentDiagnostics,
  getCommunicationTimeline,
  getMessageProjectionStatus,
  reconcileAppointmentCommunications
} from '../../services/communications/diagnosticsService.js';
import { recordCommunicationEvent } from '../../services/communications.js';

const router = express.Router();

const ADMIN_DIAGNOSTICS_ROLES = [
  'admin',
  'super_admin',
  'technical_support',
  'customer_success',
  'customer_success_manager',
  'platform_manager',
  'compliance_officer'
];

router.use(authenticateToken, requireRoles(ADMIN_DIAGNOSTICS_ROLES));

function sendDiagnosticsError(res, error) {
  if (error.status === 404 || error.message === 'APPOINTMENT_NOT_FOUND') {
    return res.status(404).json({ error: { code: 'APPOINTMENT_NOT_FOUND' } });
  }
  if (error.status === 400) {
    return res.status(400).json({ error: { code: error.message } });
  }
  if (error.message?.startsWith?.('TWILIO_') || error.code === 'TWILIO_CONVERSATIONS_ERROR') {
    return res.status(503).json({ error: { code: 'COMMUNICATIONS_PROVIDER_UNAVAILABLE' } });
  }
  console.error('Admin communications diagnostics error:', error);
  return res.status(500).json({ error: { code: 'COMMUNICATIONS_DIAGNOSTICS_FAILED' } });
}

router.get('/appointments/:appointmentId/diagnostics', async (req, res) => {
  try {
    const diagnostics = await getAppointmentDiagnostics({ appointmentId: req.params.appointmentId });
    await recordCommunicationEvent({
      appointmentId: req.params.appointmentId,
      userId: req.user.id,
      actorRole: 'admin',
      eventType: 'diagnostics_check_executed',
      metadata: { view: 'diagnostics' }
    });
    return res.json(diagnostics);
  } catch (error) {
    return sendDiagnosticsError(res, error);
  }
});

router.get('/appointments/:appointmentId/timeline', async (req, res) => {
  try {
    const timeline = await getCommunicationTimeline({
      appointmentId: req.params.appointmentId,
      limit: req.query.limit
    });
    return res.json(timeline);
  } catch (error) {
    return sendDiagnosticsError(res, error);
  }
});

router.get('/appointments/:appointmentId/messages/projection-status', async (req, res) => {
  try {
    const projection = await getMessageProjectionStatus({ appointmentId: req.params.appointmentId });
    return res.json(projection);
  } catch (error) {
    return sendDiagnosticsError(res, error);
  }
});

router.post('/appointments/:appointmentId/reconcile', async (req, res) => {
  try {
    const result = await reconcileAppointmentCommunications({
      appointmentId: req.params.appointmentId,
      user: req.user
    });
    return res.json(result);
  } catch (error) {
    return sendDiagnosticsError(res, error);
  }
});

export default router;
