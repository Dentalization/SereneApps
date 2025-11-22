import express from 'express';
import {
  getClinics,
  getClinicById,
  getClinicDentists,
  getClinicServices,
  getNearbyClinics
} from '../controllers/clinicsController.js';

const router = express.Router();

/**
 * @route GET /v1/clinics
 * @desc Get list of clinics with pagination and filters
 * @access Public
 */
router.get('/', getClinics);

/**
 * @route GET /v1/clinics/nearby
 * @desc Get clinics near a coordinate using geolocation
 * @access Public
 */
router.get('/nearby', getNearbyClinics);

/**
 * @route GET /v1/clinics/:id
 * @desc Get clinic details by ID
 * @access Public
 */
router.get('/:id', getClinicById);

/**
 * @route GET /v1/clinics/:id/dentists
 * @desc Get dentists working at a clinic
 * @access Public
 */
router.get('/:id/dentists', getClinicDentists);

/**
 * @route GET /v1/clinics/:id/services
 * @desc Get services offered by a clinic
 * @access Public
 */
router.get('/:id/services', getClinicServices);

export default router;
