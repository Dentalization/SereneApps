/**
 * @swagger
 * /notifications/register-device:
 *   post:
 *     summary: Register device for push notifications
 *     description: Register FCM device token for receiving push notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - device_token
 *             properties:
 *               device_token:
 *                 type: string
 *                 example: "fGcM_tOkEn_ExAmPlE_123456789"
 *                 description: FCM device token
 *               device_type:
 *                 type: string
 *                 enum: [ios, android, web]
 *                 example: "ios"
 *               device_name:
 *                 type: string
 *                 example: "iPhone 13 Pro"
 *     responses:
 *       201:
 *         description: Device registered successfully
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
 *                   example: "Device registered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     user_id:
 *                       type: integer
 *                     device_token:
 *                       type: string
 *                     device_type:
 *                       type: string
 *                     is_active:
 *                       type: boolean
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * /notifications:
 *   get:
 *     summary: Get notifications inbox
 *     description: Get user's in-app notifications with pagination
 *     tags: [Notifications]
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
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by notification type
 *       - in: query
 *         name: is_read
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter by read status
 *     responses:
 *       200:
 *         description: List of notifications
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
 *                     notifications:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           type:
 *                             type: string
 *                             example: "appointment_reminder"
 *                           title:
 *                             type: string
 *                             example: "Pengingat Janji Temu"
 *                           message:
 *                             type: string
 *                             example: "Janji temu Anda besok jam 10:00"
 *                           is_read:
 *                             type: boolean
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     unread_count:
 *                       type: integer
 *                       example: 5
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: Mark a single notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
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
 *                   example: "Notification marked as read"
 *       404:
 *         description: Notification not found
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Mark all unread notifications as read in bulk
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
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
 *                   example: "All notifications marked as read"
 *                 data:
 *                   type: object
 *                   properties:
 *                     updated_count:
 *                       type: integer
 *                       example: 5
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * /notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     description: Delete a notification from inbox
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
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
 *                   example: "Notification deleted successfully"
 *       404:
 *         description: Notification not found
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * /notifications/settings:
 *   get:
 *     summary: Get notification settings
 *     description: Get user's notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification settings
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
 *                     enable_push_notifications:
 *                       type: boolean
 *                       example: true
 *                     enable_email_notifications:
 *                       type: boolean
 *                       example: true
 *                     enable_sms_notifications:
 *                       type: boolean
 *                       example: false
 *                     notify_appointment_reminders:
 *                       type: boolean
 *                       example: true
 *                     notify_appointment_confirmations:
 *                       type: boolean
 *                       example: true
 *                     notify_appointment_cancellations:
 *                       type: boolean
 *                       example: true
 *                     notify_chat_messages:
 *                       type: boolean
 *                       example: true
 *                     notify_payment_updates:
 *                       type: boolean
 *                       example: true
 *                     notify_promotions:
 *                       type: boolean
 *                       example: false
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 *   patch:
 *     summary: Update notification settings
 *     description: Update user's notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enable_push_notifications:
 *                 type: boolean
 *               enable_email_notifications:
 *                 type: boolean
 *               enable_sms_notifications:
 *                 type: boolean
 *               notify_appointment_reminders:
 *                 type: boolean
 *               notify_appointment_confirmations:
 *                 type: boolean
 *               notify_appointment_cancellations:
 *                 type: boolean
 *               notify_chat_messages:
 *                 type: boolean
 *               notify_payment_updates:
 *                 type: boolean
 *               notify_promotions:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Settings updated successfully
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
 *                   example: "Notification settings updated successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
