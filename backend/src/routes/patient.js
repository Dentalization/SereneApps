import express from 'express';
import {
  getPatientProfile,
  updatePatientProfile,
  uploadPatientAvatar
} from '../controllers/patientController.js';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import {
  emitTreatmentPlanRealtime,
  getTreatmentPlanForPatient,
  listTreatmentPlansForPatient,
  respondToTreatmentPlan
} from '../services/treatmentPlans.js';

const router = express.Router();

// All patient routes require authentication and patient role
router.use(authenticateToken);

// GET /v1/patient/profile - Get patient profile (auto-creates if not exists)
router.get('/profile', requireRoles(['patient']), getPatientProfile);

// PUT /v1/patient/profile - Update patient profile
router.put('/profile', requireRoles(['patient']), updatePatientProfile);

// POST /v1/patient/avatar - Upload patient avatar
router.post('/avatar', requireRoles(['patient']), uploadPatientAvatar);

// GET /v1/patient/treatment-plans - List treatment plans visible to the patient
router.get('/treatment-plans', requireRoles(['patient']), async (req, res) => {
  try {
    const treatmentPlans = await listTreatmentPlansForPatient({
      patientId: req.user.id
    });
    return res.json({ treatmentPlans });
  } catch (error) {
    console.error('Error fetching patient treatment plans:', error);
    return res.status(error.status || 500).json({
      error: {
        code: error.message || 'TREATMENT_PLANS_FETCH_FAILED',
        message: 'Gagal memuat rencana perawatan.'
      }
    });
  }
});

// GET /v1/patient/treatment-plans/:id - View a treatment plan
router.get('/treatment-plans/:id', requireRoles(['patient']), async (req, res) => {
  try {
    const treatmentPlan = await getTreatmentPlanForPatient({
      patientId: req.user.id,
      treatmentPlanId: req.params.id
    });
    return res.json({ treatmentPlan });
  } catch (error) {
    console.error('Error fetching patient treatment plan:', error);
    return res.status(error.status || 500).json({
      error: {
        code: error.message || 'TREATMENT_PLAN_FETCH_FAILED',
        message: 'Gagal memuat rencana perawatan.'
      }
    });
  }
});

// POST /v1/patient/treatment-plans/:id/approve - Patient approval
router.post('/treatment-plans/:id/approve', requireRoles(['patient']), async (req, res) => {
  try {
    const treatmentPlan = await respondToTreatmentPlan({
      patientId: req.user.id,
      treatmentPlanId: req.params.id,
      decision: 'approve'
    });
    emitTreatmentPlanRealtime({
      io: req.app.get('io'),
      eventType: 'treatment_plan:approved',
      treatmentPlan,
      invoice: treatmentPlan.invoice
    });
    return res.json({ treatmentPlan });
  } catch (error) {
    console.error('Error approving treatment plan:', error);
    return res.status(error.status || 500).json({
      error: {
        code: error.message || 'TREATMENT_PLAN_APPROVE_FAILED',
        message: 'Gagal menyetujui rencana perawatan.'
      }
    });
  }
});

// POST /v1/patient/treatment-plans/:id/reject - Patient rejection
router.post('/treatment-plans/:id/reject', requireRoles(['patient']), async (req, res) => {
  try {
    const treatmentPlan = await respondToTreatmentPlan({
      patientId: req.user.id,
      treatmentPlanId: req.params.id,
      decision: 'reject',
      reason: req.body?.reason || null
    });
    emitTreatmentPlanRealtime({
      io: req.app.get('io'),
      eventType: 'treatment_plan:rejected',
      treatmentPlan,
      invoice: treatmentPlan.invoice
    });
    return res.json({ treatmentPlan });
  } catch (error) {
    console.error('Error rejecting treatment plan:', error);
    return res.status(error.status || 500).json({
      error: {
        code: error.message || 'TREATMENT_PLAN_REJECT_FAILED',
        message: 'Gagal menolak rencana perawatan.'
      }
    });
  }
});

export default router;
