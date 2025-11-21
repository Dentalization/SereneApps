import express from 'express';
import {
  getDentistById,
  getDentistSchedule,
  getDentistAvailableSlots,
  getNearbyDentists
} from '../controllers/dentistsController.js';

const router = express.Router();

/**
 * @route GET /v1/dentists/nearby
 * @desc Get nearby dentists based on geolocation
 * @access Public
 * @query {number} latitude - User's latitude
 * @query {number} longitude - User's longitude
 * @query {number} [radius=10] - Search radius in kilometers
 * @query {string} [type] - Dentist type: 'independent' or 'clinic'
 * @query {string} [specialization] - Filter by specialization
 */
router.get('/nearby', getNearbyDentists);

/**
 * @route GET /v1/dentists/:id
 * @desc Get dentist profile by ID
 * @access Public
 */
router.get('/:id', getDentistById);

/**
 * @route GET /v1/dentists/:id/schedule
 * @desc Get dentist's schedule and availability
 * @access Public
 */
router.get('/:id/schedule', getDentistSchedule);

/**
 * @route GET /v1/dentists/:id/available-slots
 * @desc Get available time slots for a dentist on a specific date
 * @access Public
 */
router.get('/:id/available-slots', getDentistAvailableSlots);

export default router;
