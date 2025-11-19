/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get user profile
 *     description: Get current user's profile (role-based - returns different fields for patient/dentist)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
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
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     phone_number:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [patient, dentist, admin]
 *                     avatar_url:
 *                       type: string
 *                     is_phone_verified:
 *                       type: boolean
 *                     # Patient-specific fields
 *                     date_of_birth:
 *                       type: string
 *                       format: date
 *                     gender:
 *                       type: string
 *                       enum: [male, female, other]
 *                     blood_type:
 *                       type: string
 *                     allergies:
 *                       type: string
 *                     current_medications:
 *                       type: string
 *                     medical_conditions:
 *                       type: string
 *                     # Dentist-specific fields
 *                     title:
 *                       type: string
 *                       example: "Dr."
 *                     license_number:
 *                       type: string
 *                     primary_specialization:
 *                       type: string
 *                     consultation_fee:
 *                       type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 *   patch:
 *     summary: Update user profile
 *     description: Update user profile information
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               phone_number:
 *                 type: string
 *                 example: "+628123456789"
 *               # Patient-specific fields
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-15"
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               # Dentist-specific fields
 *               title:
 *                 type: string
 *               bio:
 *                 type: string
 *               years_of_experience:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *                 data:
 *                   type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 *   delete:
 *     summary: Delete account
 *     description: Soft delete user account (sets is_active=false)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Account deleted successfully"
 *       400:
 *         description: Cannot delete - has active appointments
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * /profile/avatar:
 *   post:
 *     summary: Upload profile avatar
 *     description: Upload or update user's profile picture
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, max 5MB)
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Avatar uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     avatar_url:
 *                       type: string
 *                       example: "/uploads/avatars/user-123-1699876543210.jpg"
 *       400:
 *         description: Invalid file type or size
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * /profile/appointments:
 *   get:
 *     summary: Get user's appointments
 *     description: Get list of user's appointments with pagination
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: List of appointments
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
 *                     appointments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Appointment'
 *                     pagination:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * /profile/medical-history:
 *   get:
 *     summary: Get medical history
 *     description: Get patient's medical history (patient-only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Medical history data
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
 *                     blood_type:
 *                       type: string
 *                       example: "A+"
 *                     allergies:
 *                       type: string
 *                       example: "Penicillin, Aspirin"
 *                     current_medications:
 *                       type: string
 *                       example: "Metformin 500mg"
 *                     medical_conditions:
 *                       type: string
 *                       example: "Diabetes Type 2"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Only patients can access medical history
 *
 *   patch:
 *     summary: Update medical history
 *     description: Update patient's medical history (patient-only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               blood_type:
 *                 type: string
 *                 enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
 *               allergies:
 *                 type: string
 *                 example: "Penicillin, Aspirin"
 *               current_medications:
 *                 type: string
 *                 example: "Metformin 500mg, Lisinopril 10mg"
 *               medical_conditions:
 *                 type: string
 *                 example: "Diabetes Type 2, Hypertension"
 *     responses:
 *       200:
 *         description: Medical history updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Medical history updated successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Only patients can update medical history
 */
