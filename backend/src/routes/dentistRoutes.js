/**
 * Dentist Routes
 * Public routes for dentist search and details
 */

const express = require('express');
const router = express.Router();
const dentistController = require('../controllers/dentistController');

/**
 * GET /v1/dentists/nearby
 * Get nearby dentists based on location
 * Query params: latitude, longitude, radius, type, specialization
 */
router.get('/nearby', dentistController.getNearbyDentists);

/**
 * GET /v1/dentists/:id
 * Get dentist details by ID
 */
router.get('/:id', dentistController.getDentistById);

module.exports = router;
