import express from 'express';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  getProfileAppointments,
  getMedicalHistory,
  updateMedicalHistory,
  getTreatmentPlans,
  getHealthHistory,
  deleteAccount
} from '../controllers/profileController.js';
import { authenticateToken } from '../utils/tokens.js';

const router = express.Router();

// All profile routes require authentication
router.use(authenticateToken);

// GET /v1/profile - Get current user's profile
router.get('/', getProfile);

// PATCH /v1/profile - Update profile
router.patch('/', updateProfile);

// POST /v1/profile/avatar - Upload avatar
router.post('/avatar', uploadAvatar);

// GET /v1/profile/appointments - Get user's appointments
router.get('/appointments', getProfileAppointments);

// GET /v1/profile/medical-history - Get medical history (patients only)
router.get('/medical-history', getMedicalHistory);

// PATCH /v1/profile/medical-history - Update medical history (patients only)
router.patch('/medical-history', updateMedicalHistory);

// GET /v1/profile/treatment-plans - Get treatment plans (patients only)
router.get('/treatment-plans', getTreatmentPlans);

// GET /v1/profile/health-history - Get aggregated health journey (patients only)
router.get('/health-history', getHealthHistory);

// DELETE /v1/profile - Delete account
router.delete('/', deleteAccount);

export default router;
