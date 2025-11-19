import express from 'express';
import {
  getDentistById,
  getDentistSchedule,
  getDentistAvailableSlots
} from '../controllers/dentistsController.js';

const router = express.Router();

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
