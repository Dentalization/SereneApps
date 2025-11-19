/**
 * @swagger
 * /v1/clinics:
 *   get:
 *     summary: Get list of clinics
 *     description: |
 *       Retrieve a paginated list of dental clinics with optional filtering and search.
 *       
 *       **Features:**
 *       - Pagination support
 *       - Search by clinic name, legal name, or address
 *       - Filter by city
 *       - Sort by various fields
 *       - Includes dentist count for each clinic
 *     tags:
 *       - Clinics
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by clinic name, legal name, or address
 *         example: Dental Care
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *         example: Jakarta
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, created_at]
 *           default: name
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: List of clinics retrieved successfully
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
 *                     clinics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           brand_name:
 *                             type: string
 *                             example: Dental Care Plus
 *                           legal_name:
 *                             type: string
 *                             example: PT Klinik Gigi Sehat Bersama
 *                           phone:
 *                             type: string
 *                             example: +6221234567
 *                           street_address:
 *                             type: string
 *                             example: Jl. Sudirman No. 123
 *                           city:
 *                             type: string
 *                             example: Jakarta
 *                           province:
 *                             type: string
 *                             example: DKI Jakarta
 *                           postal_code:
 *                             type: string
 *                             example: 12190
 *                           facility_type:
 *                             type: string
 *                             example: clinic
 *                           is_verified:
 *                             type: boolean
 *                             example: true
 *                           dentist_count:
 *                             type: integer
 *                             example: 5
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 50
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /v1/clinics/{id}:
 *   get:
 *     summary: Get clinic details
 *     description: |
 *       Retrieve detailed information about a specific clinic including:
 *       - Basic information (name, address, contact)
 *       - Operating hours for each day
 *       - Owner information
 *       - Verification status
 *       - Facility type and license details
 *     tags:
 *       - Clinics
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Clinic ID
 *     responses:
 *       200:
 *         description: Clinic details retrieved successfully
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
 *                       example: 1
 *                     brand_name:
 *                       type: string
 *                       example: Dental Care Plus
 *                     legal_name:
 *                       type: string
 *                       example: PT Klinik Gigi Sehat Bersama
 *                     phone:
 *                       type: string
 *                       example: +6221234567
 *                     email:
 *                       type: string
 *                       example: info@dentalcareplus.com
 *                     street_address:
 *                       type: string
 *                       example: Jl. Sudirman No. 123
 *                     city:
 *                       type: string
 *                       example: Jakarta
 *                     province:
 *                       type: string
 *                       example: DKI Jakarta
 *                     postal_code:
 *                       type: string
 *                       example: 12190
 *                     facility_type:
 *                       type: string
 *                       example: clinic
 *                     license_number:
 *                       type: string
 *                       example: KLINIK-JKT-2024-001
 *                     operating_hours:
 *                       type: object
 *                       description: Operating hours for each day of the week
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
 *                     is_verified:
 *                       type: boolean
 *                       example: true
 *                     owner_name:
 *                       type: string
 *                       example: Dr. John Doe
 *                     owner_email:
 *                       type: string
 *                       example: owner@dentalcareplus.com
 *       404:
 *         description: Clinic not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 7001
 *                 errorCode:
 *                   type: string
 *                   example: CLINIC_NOT_FOUND
 *                 message:
 *                   type: string
 *                   example: Klinik tidak ditemukan
 *                 solution:
 *                   type: string
 *                   example: Periksa kembali ID klinik
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /v1/clinics/{id}/dentists:
 *   get:
 *     summary: Get dentists at a clinic
 *     description: |
 *       Retrieve a list of dentists working at a specific clinic with pagination.
 *       
 *       **Features:**
 *       - Filter by specialization
 *       - Pagination support
 *       - Includes consultation fees and availability
 *     tags:
 *       - Clinics
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Clinic ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *         description: Filter by dentist specialization
 *         example: Ortodontik
 *     responses:
 *       200:
 *         description: Dentist list retrieved successfully
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
 *                     clinic_id:
 *                       type: integer
 *                       example: 1
 *                     clinic_name:
 *                       type: string
 *                       example: Dental Care Plus
 *                     dentists:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 8
 *                           name:
 *                             type: string
 *                             example: Dr. Yessa Holic
 *                           title:
 *                             type: string
 *                             example: Dr. drg, Sp.Ort
 *                           primary_specialization:
 *                             type: string
 *                             example: Ortodontik
 *                           years_of_experience:
 *                             type: integer
 *                             example: 20
 *                           consultation_fee:
 *                             type: number
 *                             example: 500000
 *                           accepts_insurance:
 *                             type: boolean
 *                             example: true
 *                           accepts_bpjs:
 *                             type: boolean
 *                             example: false
 *                           is_verified:
 *                             type: boolean
 *                             example: true
 *                           role:
 *                             type: string
 *                             example: dentist
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 15
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         totalPages:
 *                           type: integer
 *                           example: 2
 *       404:
 *         description: Clinic not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 7001
 *                 errorCode:
 *                   type: string
 *                   example: CLINIC_NOT_FOUND
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /v1/clinics/{id}/services:
 *   get:
 *     summary: Get clinic services
 *     description: |
 *       Retrieve list of services offered by a clinic.
 *       
 *       **Note:** Currently returns empty array with a message.
 *       Services table will be implemented in future updates.
 *     tags:
 *       - Clinics
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Clinic ID
 *     responses:
 *       200:
 *         description: Services list retrieved successfully
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
 *                     clinic_id:
 *                       type: string
 *                       example: "1"
 *                     clinic_name:
 *                       type: string
 *                       example: Dental Care Plus
 *                     legal_name:
 *                       type: string
 *                       example: PT Klinik Gigi Sehat Bersama
 *                     services:
 *                       type: array
 *                       items:
 *                         type: object
 *                       example: []
 *                     message:
 *                       type: string
 *                       example: Layanan klinik akan segera tersedia
 *                     messageEn:
 *                       type: string
 *                       example: Clinic services will be available soon
 *       404:
 *         description: Clinic not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 7001
 *                 errorCode:
 *                   type: string
 *                   example: CLINIC_NOT_FOUND
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
