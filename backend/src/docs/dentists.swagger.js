/**
 * @swagger
 * /v1/dentists/{id}:
 *   get:
 *     summary: Get dentist profile
 *     description: |
 *       Retrieve detailed profile of a dentist including:
 *       - Personal and professional information
 *       - Education and certifications
 *       - Specializations and services offered
 *       - Consultation fees and insurance acceptance
 *       - List of clinics where they work
 *       - Contact and availability details
 *     tags:
 *       - Dentists
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dentist ID
 *     responses:
 *       200:
 *         description: Dentist profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 8
 *                     user_id:
 *                       type: integer
 *                       example: 3
 *                     name:
 *                       type: string
 *                       example: Dr. Yessa Holic
 *                     email:
 *                       type: string
 *                       example: yessa.holic@dentalcare.com
 *                     phone:
 *                       type: string
 *                       example: +628123456789
 *                     title:
 *                       type: string
 *                       example: Dr. drg, Sp.Ort
 *                     primary_specialization:
 *                       type: string
 *                       example: Ortodontik
 *                     education_qualification:
 *                       type: string
 *                       example: Universitas Indonesia, Spesialis Ortodonti
 *                     license_number:
 *                       type: string
 *                       example: STR-12345678
 *                     license_issuing_body:
 *                       type: string
 *                       example: Konsil Kedokteran Indonesia
 *                     years_of_experience:
 *                       type: integer
 *                       example: 20
 *                     consultation_types:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["in-person", "video-call"]
 *                     services_offered:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Pemasangan Behel", "Kawat Gigi", "Retainer"]
 *                     consultation_fee:
 *                       type: number
 *                       example: 500000
 *                     accepts_insurance:
 *                       type: boolean
 *                       example: true
 *                     accepts_bpjs:
 *                       type: boolean
 *                       example: false
 *                     emergency_availability:
 *                       type: boolean
 *                       example: true
 *                     is_verified:
 *                       type: boolean
 *                       example: true
 *                     avatar_url:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     clinics:
 *                       type: array
 *                       description: List of clinics where the dentist works
 *                       items:
 *                         type: object
 *                         properties:
 *                           clinic_id:
 *                             type: integer
 *                             example: 1
 *                           clinic_name:
 *                             type: string
 *                             example: Dental Care Plus
 *                           clinic_address:
 *                             type: string
 *                             example: Jl. Sudirman No. 123, Jakarta
 *                           role:
 *                             type: string
 *                             example: dentist
 *                           is_active:
 *                             type: boolean
 *                             example: true
 *       404:
 *         description: Dentist not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 7002
 *                 errorCode:
 *                   type: string
 *                   example: DENTIST_NOT_FOUND
 *                 message:
 *                   type: string
 *                   example: Dokter gigi tidak ditemukan
 *                 solution:
 *                   type: string
 *                   example: Periksa kembali ID dokter gigi
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /v1/dentists/{id}/schedule:
 *   get:
 *     summary: Get dentist schedule
 *     description: |
 *       Retrieve dentist's working schedule at a specific clinic.
 *       
 *       **Features:**
 *       - Operating hours for each day of the week
 *       - Optional: Booked appointments for a specific date
 *       - Clinic information
 *       
 *       **Query Parameters:**
 *       - `clinicId` (required): The clinic where the dentist works
 *       - `date` (optional): Specific date to see booked appointments (YYYY-MM-DD)
 *     tags:
 *       - Dentists
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dentist ID
 *       - in: query
 *         name: clinicId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Clinic ID where the dentist works
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Specific date to see booked slots (YYYY-MM-DD)
 *         example: "2025-11-10"
 *     responses:
 *       200:
 *         description: Dentist schedule retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     dentist_id:
 *                       type: string
 *                       example: "8"
 *                     dentist_name:
 *                       type: string
 *                       example: Dr. Yessa Holic
 *                     clinic_id:
 *                       type: string
 *                       example: "1"
 *                     clinic_name:
 *                       type: string
 *                       example: Dental Care Plus
 *                     operating_hours:
 *                       type: object
 *                       description: Operating hours for each day
 *                       example:
 *                         monday:
 *                           open: "08:00"
 *                           close: "17:00"
 *                           isOpen: true
 *                         tuesday:
 *                           open: "08:00"
 *                           close: "17:00"
 *                           isOpen: true
 *                         sunday:
 *                           open: "08:00"
 *                           close: "17:00"
 *                           isOpen: false
 *                     booked_slots:
 *                       type: array
 *                       description: Only present if date parameter is provided
 *                       items:
 *                         type: object
 *                         properties:
 *                           starts_at:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-11-10T09:00:00.000Z"
 *                           ends_at:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-11-10T10:00:00.000Z"
 *                           status:
 *                             type: string
 *                             example: confirmed
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 9001
 *                 errorCode:
 *                   type: string
 *                   example: VALIDATION_ERROR
 *                 message:
 *                   type: string
 *                   example: clinicId is required
 *       404:
 *         description: Dentist not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 7002
 *                 errorCode:
 *                   type: string
 *                   example: DENTIST_NOT_FOUND
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /v1/dentists/{id}/available-slots:
 *   get:
 *     summary: Get available appointment slots
 *     description: |
 *       Get available time slots for booking an appointment with a dentist at a specific clinic on a specific date.
 *       
 *       **Features:**
 *       - Generates time slots based on clinic operating hours
 *       - Excludes already booked appointments
 *       - Configurable slot duration (default: 60 minutes)
 *       - Handles clinic closed days
 *       
 *       **Slot Generation Logic:**
 *       - Slots are generated from clinic opening to closing time
 *       - Each slot checks for overlap with existing appointments
 *       - Slots must fit within operating hours (won't extend past closing time)
 *     tags:
 *       - Dentists
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dentist ID
 *       - in: query
 *         name: clinicId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Clinic ID where the dentist works
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for appointment (YYYY-MM-DD)
 *         example: "2025-11-10"
 *       - in: query
 *         name: duration
 *         schema:
 *           type: integer
 *           default: 60
 *         description: Appointment duration in minutes
 *         example: 30
 *     responses:
 *       200:
 *         description: Available slots retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     dentist_id:
 *                       type: string
 *                       example: "8"
 *                     clinic_id:
 *                       type: string
 *                       example: "1"
 *                     date:
 *                       type: string
 *                       example: "2025-11-10"
 *                     day_of_week:
 *                       type: string
 *                       example: monday
 *                     operating_hours:
 *                       type: object
 *                       properties:
 *                         open:
 *                           type: string
 *                           example: "08:00"
 *                         close:
 *                           type: string
 *                           example: "17:00"
 *                         isOpen:
 *                           type: boolean
 *                           example: true
 *                     slot_duration:
 *                       type: integer
 *                       example: 60
 *                     available_slots:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           time:
 *                             type: string
 *                             example: "09:00"
 *                           available:
 *                             type: boolean
 *                             example: true
 *       200 (Clinic Closed):
 *         description: Clinic is closed on the requested day
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     dentist_id:
 *                       type: string
 *                       example: "8"
 *                     clinic_id:
 *                       type: string
 *                       example: "1"
 *                     date:
 *                       type: string
 *                       example: "2025-11-09"
 *                     day_of_week:
 *                       type: string
 *                       example: sunday
 *                     available_slots:
 *                       type: array
 *                       example: []
 *                 message:
 *                   type: string
 *                   example: Klinik tutup pada hari Sunday
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 9001
 *                 errorCode:
 *                   type: string
 *                   example: VALIDATION_ERROR
 *                 message:
 *                   type: string
 *                   example: date and clinicId are required
 *       404:
 *         description: Dentist not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 7002
 *                 errorCode:
 *                   type: string
 *                   example: DENTIST_NOT_FOUND
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
