import { query } from '../db.js';
import { APIError, ERROR_CODES } from '../utils/error-codes.js';

/**
 * POST /v1/chat/rooms
 * Create or get existing chat room for appointment
 */
export const createChatRoom = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { appointment_id } = req.body;

    if (!appointment_id) {
      throw new APIError(
        ERROR_CODES.VALIDATION_ERROR.code,
        'VALIDATION_ERROR',
        'Appointment ID diperlukan',
        'Berikan appointment_id yang valid'
      );
    }

    // Verify appointment exists and user is authorized (patient or dentist of the appointment)
    const appointmentQuery = `
      SELECT a.id, a.patient_id, a.dentist_id
      FROM appointments a
      WHERE a.id = $1
    `;
    const appointmentResult = await query(appointmentQuery, [appointment_id]);

    if (appointmentResult.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.APPOINTMENT_NOT_FOUND.code,
        'APPOINTMENT_NOT_FOUND',
        'Appointment tidak ditemukan',
        'Periksa kembali ID appointment'
      );
    }

    const appointment = appointmentResult.rows[0];

    // Check authorization - user must be patient or dentist of this appointment
    if (appointment.patient_id !== user_id && appointment.dentist_id !== user_id) {
      throw new APIError(
        ERROR_CODES.CHAT_UNAUTHORIZED.code,
        'CHAT_UNAUTHORIZED',
        'Anda tidak memiliki akses ke chat ini',
        'Hanya pasien dan dokter yang bisa akses chat'
      );
    }

    // Check if chat room already exists
    const checkQuery = `
      SELECT * FROM chat_rooms WHERE appointment_id = $1
    `;
    const existing = await query(checkQuery, [appointment_id]);

    if (existing.rows.length > 0) {
      // Return existing chat room
      return res.json({
        success: true,
        message: 'Chat room retrieved successfully',
        data: existing.rows[0]
      });
    }

    // Create new chat room
    const channelName = `appointment_${appointment_id}_chat`;
    const insertQuery = `
      INSERT INTO chat_rooms (appointment_id, channel_name)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await query(insertQuery, [appointment_id, channelName]);

    // Add room members
    const memberQuery = `
      INSERT INTO chat_room_members (chat_room_id, user_id, role)
      VALUES 
        ($1, $2, 'patient'),
        ($1, $3, 'dentist')
    `;
    await query(memberQuery, [result.rows[0].id, appointment.patient_id, appointment.dentist_id]);

    res.status(201).json({
      success: true,
      message: 'Chat room created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /v1/chat/rooms
 * Get user's chat rooms
 */
export const getChatRooms = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const roomsQuery = `
      SELECT 
        cr.*,
        a.starts_at as appointment_date,
        a.status as appointment_status,
        u_other.id as other_user_id,
        u_other.name as other_user_name,
        u_other.avatar_url as other_user_avatar,
        (
          SELECT cm.message
          FROM chat_messages cm
          WHERE cm.chat_room_id = cr.id
          ORDER BY cm.created_at DESC
          LIMIT 1
        ) as last_message,
        (
          SELECT cm.created_at
          FROM chat_messages cm
          WHERE cm.chat_room_id = cr.id
          ORDER BY cm.created_at DESC
          LIMIT 1
        ) as last_message_at,
        (
          SELECT COUNT(*)
          FROM chat_messages cm
          JOIN chat_room_members crm ON crm.chat_room_id = cr.id AND crm.user_id = $1
          WHERE cm.chat_room_id = cr.id 
            AND cm.sender_id != $1
            AND (crm.last_read_at IS NULL OR cm.created_at > crm.last_read_at)
        ) as unread_count
      FROM chat_rooms cr
      JOIN appointments a ON a.id = cr.appointment_id
      JOIN chat_room_members crm ON crm.chat_room_id = cr.id AND crm.user_id = $1
      LEFT JOIN chat_room_members crm_other ON crm_other.chat_room_id = cr.id AND crm_other.user_id != $1
      LEFT JOIN users u_other ON u_other.id = crm_other.user_id
      ORDER BY 
        CASE 
          WHEN (SELECT created_at FROM chat_messages WHERE chat_room_id = cr.id ORDER BY created_at DESC LIMIT 1) IS NOT NULL
          THEN (SELECT created_at FROM chat_messages WHERE chat_room_id = cr.id ORDER BY created_at DESC LIMIT 1)
          ELSE cr.created_at
        END DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(roomsQuery, [user_id, parseInt(limit), offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM chat_rooms cr
      JOIN chat_room_members crm ON crm.chat_room_id = cr.id
      WHERE crm.user_id = $1
    `;
    const countResult = await query(countQuery, [user_id]);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        chat_rooms: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /v1/chat/rooms/:id/messages
 * Get messages in a chat room
 */
export const getChatMessages = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Verify user is member of this chat room
    const memberQuery = `
      SELECT * FROM chat_room_members 
      WHERE chat_room_id = $1 AND user_id = $2
    `;
    const memberCheck = await query(memberQuery, [id, user_id]);

    if (memberCheck.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.CHAT_UNAUTHORIZED.code,
        'CHAT_UNAUTHORIZED',
        'Anda tidak memiliki akses ke chat ini',
        'Hanya member room yang bisa akses chat'
      );
    }

    // Get messages
    const messagesQuery = `
      SELECT 
        cm.*,
        u.name as sender_name,
        u.avatar_url as sender_avatar,
        u.role as sender_role
      FROM chat_messages cm
      JOIN users u ON u.id = cm.sender_id
      WHERE cm.chat_room_id = $1
      ORDER BY cm.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await query(messagesQuery, [id, parseInt(limit), offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM chat_messages
      WHERE chat_room_id = $1
    `;
    const countResult = await query(countQuery, [id]);
    const total = parseInt(countResult.rows[0].total);

    // Reverse to show oldest first
    const messages = result.rows.reverse();

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /v1/chat/rooms/:id/messages
 * Send a message in a chat room
 */
export const sendMessage = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;
    const { message, message_type = 'text', file_url = null, file_name = null } = req.body;

    if (!message && !file_url) {
      throw new APIError(
        ERROR_CODES.VALIDATION_ERROR.code,
        'VALIDATION_ERROR',
        'Pesan atau file diperlukan',
        'Berikan message atau file_url'
      );
    }

    if (message && message.length > 5000) {
      throw new APIError(
        ERROR_CODES.CHAT_MESSAGE_TOO_LONG.code,
        'CHAT_MESSAGE_TOO_LONG',
        'Pesan terlalu panjang',
        'Maksimal 5000 karakter per pesan'
      );
    }

    // Verify user is member of this chat room
    const memberQuery = `
      SELECT * FROM chat_room_members 
      WHERE chat_room_id = $1 AND user_id = $2
    `;
    const memberCheck = await query(memberQuery, [id, user_id]);

    if (memberCheck.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.CHAT_UNAUTHORIZED.code,
        'CHAT_UNAUTHORIZED',
        'Anda tidak memiliki akses ke chat ini',
        'Hanya member room yang bisa mengirim pesan'
      );
    }

    // Insert message
    const insertQuery = `
      INSERT INTO chat_messages (chat_room_id, sender_id, message, message_type, file_url, file_name)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await query(insertQuery, [id, user_id, message || '', message_type, file_url, file_name]);

    // Get sender info
    const userQuery = `
      SELECT name, avatar_url, role FROM users WHERE id = $1
    `;
    const userResult = await query(userQuery, [user_id]);

    const messageData = {
      ...result.rows[0],
      sender_name: userResult.rows[0].name,
      sender_avatar: userResult.rows[0].avatar_url,
      sender_role: userResult.rows[0].role
    };

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: messageData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /v1/chat/messages/:id
 * Edit a message
 */
export const editMessage = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      throw new APIError(
        ERROR_CODES.VALIDATION_ERROR.code,
        'VALIDATION_ERROR',
        'Pesan diperlukan',
        'Berikan message yang valid'
      );
    }

    if (message.length > 5000) {
      throw new APIError(
        ERROR_CODES.CHAT_MESSAGE_TOO_LONG.code,
        'CHAT_MESSAGE_TOO_LONG',
        'Pesan terlalu panjang',
        'Maksimal 5000 karakter per pesan'
      );
    }

    // Verify message exists and user is the sender
    const checkQuery = `
      SELECT * FROM chat_messages 
      WHERE id = $1 AND sender_id = $2
    `;
    const checkResult = await query(checkQuery, [id, user_id]);

    if (checkResult.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.CHAT_UNAUTHORIZED.code,
        'CHAT_UNAUTHORIZED',
        'Anda tidak bisa edit pesan ini',
        'Hanya pengirim yang bisa edit pesan'
      );
    }

    // Update message
    const updateQuery = `
      UPDATE chat_messages
      SET message = $1
      WHERE id = $2 AND sender_id = $3
      RETURNING *
    `;
    const result = await query(updateQuery, [message, id, user_id]);

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /v1/chat/messages/:id
 * Delete a message
 */
export const deleteMessage = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;

    // Verify message exists and user is the sender
    const checkQuery = `
      SELECT * FROM chat_messages 
      WHERE id = $1 AND sender_id = $2
    `;
    const checkResult = await query(checkQuery, [id, user_id]);

    if (checkResult.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.CHAT_UNAUTHORIZED.code,
        'CHAT_UNAUTHORIZED',
        'Anda tidak bisa delete pesan ini',
        'Hanya pengirim yang bisa delete pesan'
      );
    }

    // Delete message
    const deleteQuery = `
      DELETE FROM chat_messages
      WHERE id = $1 AND sender_id = $2
      RETURNING id
    `;
    const result = await query(deleteQuery, [id, user_id]);

    res.json({
      success: true,
      message: 'Message deleted successfully',
      data: {
        deleted_id: result.rows[0].id
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /v1/chat/rooms/:id/typing
 * Send typing indicator
 */
export const sendTypingIndicator = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;
    const { is_typing = true } = req.body;

    // Verify user is member of this chat room
    const memberQuery = `
      SELECT * FROM chat_room_members 
      WHERE chat_room_id = $1 AND user_id = $2
    `;
    const memberCheck = await query(memberQuery, [id, user_id]);

    if (memberCheck.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.CHAT_UNAUTHORIZED.code,
        'CHAT_UNAUTHORIZED',
        'Anda tidak memiliki akses ke chat ini',
        'Hanya member room yang bisa mengirim typing indicator'
      );
    }

    // In real implementation, this would emit a Socket.IO event
    // For now, just return success
    res.json({
      success: true,
      message: 'Typing indicator sent',
      data: {
        chat_room_id: id,
        user_id,
        is_typing
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /v1/chat/messages/:id/read
 * Mark message as read (update last_read_at)
 */
export const markMessageAsRead = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;

    // Get message and chat room
    const messageQuery = `
      SELECT chat_room_id FROM chat_messages WHERE id = $1
    `;
    const messageResult = await query(messageQuery, [id]);

    if (messageResult.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.VALIDATION_ERROR.code,
        'VALIDATION_ERROR',
        'Pesan tidak ditemukan',
        'Periksa kembali ID pesan'
      );
    }

    const chat_room_id = messageResult.rows[0].chat_room_id;

    // Update last_read_at for this user in this room
    const updateQuery = `
      UPDATE chat_room_members
      SET last_read_at = NOW()
      WHERE chat_room_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await query(updateQuery, [chat_room_id, user_id]);

    if (result.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.CHAT_UNAUTHORIZED.code,
        'CHAT_UNAUTHORIZED',
        'Anda tidak memiliki akses ke chat ini',
        'Hanya member room yang bisa mark as read'
      );
    }

    res.json({
      success: true,
      message: 'Messages marked as read',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};
