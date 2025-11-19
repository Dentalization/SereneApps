import express from 'express';
import {
  getPatientProfile,
  updatePatientProfile,
  uploadPatientAvatar
} from '../controllers/patientController.js';
import { authenticateToken, requireRoles } from '../utils/tokens.js';

const router = express.Router();

// All patient routes require authentication and patient role
router.use(authenticateToken);

// GET /v1/patient/profile - Get patient profile (auto-creates if not exists)
router.get('/profile', requireRoles(['patient']), getPatientProfile);

// PUT /v1/patient/profile - Update patient profile
router.put('/profile', requireRoles(['patient']), updatePatientProfile);

// POST /v1/patient/avatar - Upload patient avatar
router.post('/avatar', requireRoles(['patient']), uploadPatientAvatar);

export default router;
