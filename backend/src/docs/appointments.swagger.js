/**
 * @swagger
 * /appointments/availability:
 *   get:
 *     summary: Check dentist availability
 *     description: Check if a dentist is available for booking at specified time
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dentistId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the dentist
 *       - in: query
 *         name: clinicBranchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the clinic branch
 *       - in: query
 *         name: startsAt
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Appointment start time (ISO 8601)
 *       - in: query
 *         name: endsAt
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Appointment end time (ISO 8601)
 *     responses:
 *       200:
 *         description: Availability check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       400:
 *         description: Validation error
 *
 * /appointments:
 *   post:
 *     summary: Create new appointment
 *     description: Book a new appointment (patient only)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dentistId
 *               - clinicBranchId
 *               - startsAt
 *               - endsAt
 *             properties:
 *               dentistId:
 *                 type: integer
 *                 example: 5
 *               clinicBranchId:
 *                 type: integer
 *                 example: 1
 *               startsAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-15T10:00:00Z"
 *               endsAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-15T11:00:00Z"
 *               notes:
 *                 type: string
 *                 example: "Sakit gigi belakang kanan"
 *     responses:
 *       201:
 *         description: Appointment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appointment:
 *                   $ref: '#/components/schemas/Appointment'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       400:
 *         description: Slot already taken or invalid time
 *
 *   get:
 *     summary: List appointments
 *     description: Get user's appointments with filtering (supports patient, dentist, and clinic views)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [patient, dentist, clinic]
 *         description: View type (defaults based on user role)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, in_progress, completed, cancelled, no_show]
 *         description: Filter by appointment status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of appointments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appointments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Appointment'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     byStatus:
 *                       type: object
 *                 view:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * /appointments/{appointmentId}:
 *   get:
 *     summary: Get appointment details
 *     description: Get single appointment details (only patient/dentist of the appointment can access)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appointment:
 *                   $ref: '#/components/schemas/Appointment'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Appointment not found
 *
 * /appointments/{appointmentId}/reschedule:
 *   patch:
 *     summary: Reschedule appointment
 *     description: Reschedule an appointment (patient only, cannot reschedule within 24 hours)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startsAt
 *               - endsAt
 *             properties:
 *               startsAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-20T14:00:00Z"
 *               endsAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-20T15:00:00Z"
 *     responses:
 *       200:
 *         description: Appointment rescheduled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Janji temu berhasil dijadwalkan ulang."
 *                 appointment:
 *                   $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Cannot reschedule (within 24 hours or slot taken)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *
 * /appointments/{appointmentId}/cancel:
 *   patch:
 *     summary: Cancel appointment
 *     description: Cancel an appointment (patient only, cannot cancel within 24 hours)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Bentrok dengan jadwal lain"
 *     responses:
 *       200:
 *         description: Appointment cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Janji temu berhasil dibatalkan."
 *       400:
 *         description: Cannot cancel (within 24 hours or already cancelled)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *
 * /appointments/{appointmentId}/confirm:
 *   patch:
 *     summary: Confirm appointment
 *     description: Confirm an appointment (dentist/staff only)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Janji temu berhasil dikonfirmasi."
 *       400:
 *         description: Already confirmed or invalid status
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
