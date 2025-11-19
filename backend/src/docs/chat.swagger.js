/**
 * @swagger
 * /chat/rooms:
 *   post:
 *     summary: Create or get chat room
 *     description: Create chat room for an appointment or get existing one
 *     tags: [Communications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointment_id
 *             properties:
 *               appointment_id:
 *                 type: integer
 *                 example: 123
 *                 description: Appointment ID to create chat for
 *     responses:
 *       201:
 *         description: Chat room created successfully
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
 *                   example: "Chat room created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     appointment_id:
 *                       type: integer
 *                     channel_name:
 *                       type: string
 *                       example: "appointment_123_chat"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Only patient/dentist of the appointment can create chat
 *
 *   get:
 *     summary: List chat rooms
 *     description: Get user's chat rooms with last message and unread count
 *     tags: [Communications]
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
 *     responses:
 *       200:
 *         description: List of chat rooms
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
 *                     chat_rooms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           appointment_id:
 *                             type: integer
 *                           appointment_date:
 *                             type: string
 *                             format: date-time
 *                           appointment_status:
 *                             type: string
 *                           other_user_name:
 *                             type: string
 *                             example: "Dr. John Smith"
 *                           other_user_avatar:
 *                             type: string
 *                           last_message:
 *                             type: string
 *                             example: "Terima kasih dokter"
 *                           last_message_at:
 *                             type: string
 *                             format: date-time
 *                           unread_count:
 *                             type: integer
 *                             example: 3
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
 * /chat/rooms/{id}/messages:
 *   get:
 *     summary: Get chat messages
 *     description: Get messages in a chat room with pagination
 *     tags: [Communications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Chat room ID
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
 *           default: 50
 *         description: Messages per page
 *     responses:
 *       200:
 *         description: List of messages
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
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           sender_id:
 *                             type: integer
 *                           sender_name:
 *                             type: string
 *                           sender_avatar:
 *                             type: string
 *                           sender_role:
 *                             type: string
 *                           message:
 *                             type: string
 *                           message_type:
 *                             type: string
 *                             enum: [text, image, file]
 *                           file_url:
 *                             type: string
 *                           file_name:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Only room members can view messages
 *
 *   post:
 *     summary: Send message
 *     description: Send a message in a chat room
 *     tags: [Communications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Chat room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Halo dokter, saya ingin konsultasi"
 *                 maxLength: 5000
 *               message_type:
 *                 type: string
 *                 enum: [text, image, file]
 *                 default: text
 *               file_url:
 *                 type: string
 *                 description: URL of uploaded file (if message_type is image/file)
 *               file_name:
 *                 type: string
 *                 description: Original filename
 *     responses:
 *       201:
 *         description: Message sent successfully
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
 *                   example: "Message sent successfully"
 *                 data:
 *                   type: object
 *       400:
 *         description: Message too long (>5000 characters)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Only room members can send messages
 *
 * /chat/messages/{id}:
 *   patch:
 *     summary: Edit message
 *     description: Edit a message (only sender can edit)
 *     tags: [Communications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Halo dokter, saya ingin konsultasi (edited)"
 *                 maxLength: 5000
 *     responses:
 *       200:
 *         description: Message updated successfully
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
 *                   example: "Message updated successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Only sender can edit message
 *
 *   delete:
 *     summary: Delete message
 *     description: Delete a message (only sender can delete)
 *     tags: [Communications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted successfully
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
 *                   example: "Message deleted successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Only sender can delete message
 *
 * /chat/rooms/{id}/typing:
 *   post:
 *     summary: Send typing indicator
 *     description: Notify other users that you are typing
 *     tags: [Communications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Chat room ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_typing:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Typing indicator sent
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
 *                   example: "Typing indicator sent"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * /chat/messages/{id}/read:
 *   post:
 *     summary: Mark messages as read
 *     description: Update last_read_at timestamp for the room
 *     tags: [Communications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Message ID (will mark all messages up to this one as read)
 *     responses:
 *       200:
 *         description: Messages marked as read
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
 *                   example: "Messages marked as read"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
