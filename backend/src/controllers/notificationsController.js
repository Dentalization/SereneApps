import { query } from '../db.js';
import { APIError, ERROR_CODES } from '../utils/error-codes.js';

/**
 * POST /v1/notifications/register-device
 * Register FCM device token
 */
export const registerDevice = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { device_token, device_type, device_name } = req.body;

    if (!device_token) {
      throw new APIError(
        ERROR_CODES.VALIDATION_ERROR.code,
        'VALIDATION_ERROR',
        'Device token diperlukan',
        'Berikan device_token yang valid'
      );
    }

    // Check if device already registered
    const checkQuery = `
      SELECT id FROM user_devices
      WHERE user_id = $1 AND device_token = $2
    `;
    const existing = await query(checkQuery, [user_id, device_token]);

    if (existing.rows.length > 0) {
      // Update existing device
      const updateQuery = `
        UPDATE user_devices
        SET 
          device_type = $1,
          device_name = $2,
          is_active = true,
          last_active_at = NOW()
        WHERE user_id = $3 AND device_token = $4
        RETURNING *
      `;
      const result = await query(updateQuery, [device_type, device_name, user_id, device_token]);
      
      return res.json({
        success: true,
        message: 'Device updated successfully',
        data: result.rows[0]
      });
    }

    // Register new device
    const insertQuery = `
      INSERT INTO user_devices (user_id, device_token, device_type, device_name)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await query(insertQuery, [user_id, device_token, device_type, device_name]);

    res.status(201).json({
      success: true,
      message: 'Device registered successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /v1/notifications
 * Get user's notifications
 */
export const getNotifications = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      type = '', 
      is_read = '' 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause
    const conditions = ['user_id = $1'];
    const params = [user_id];
    let paramIndex = 2;

    if (type) {
      conditions.push(`type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (is_read !== '') {
      conditions.push(`is_read = $${paramIndex}`);
      params.push(is_read === 'true');
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM notifications
      WHERE ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get notifications
    const notificationsQuery = `
      SELECT *
      FROM notifications
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(parseInt(limit), offset);
    const result = await query(notificationsQuery, params);

    // Get unread count
    const unreadQuery = `
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `;
    const unreadResult = await query(unreadQuery, [user_id]);

    res.json({
      success: true,
      data: {
        notifications: result.rows,
        unread_count: parseInt(unreadResult.rows[0].unread_count),
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
 * PATCH /v1/notifications/:id/read
 * Mark notification as read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;

    const updateQuery = `
      UPDATE notifications
      SET is_read = true, read_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await query(updateQuery, [id, user_id]);

    if (result.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.NOTIFICATION_NOT_FOUND.code,
        'NOTIFICATION_NOT_FOUND',
        'Notifikasi tidak ditemukan',
        'Periksa kembali ID notifikasi'
      );
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /v1/notifications/read-all
 * Mark all notifications as read
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const user_id = req.user.id;

    const updateQuery = `
      UPDATE notifications
      SET is_read = true, read_at = NOW()
      WHERE user_id = $1 AND is_read = false
      RETURNING COUNT(*) as updated_count
    `;

    const result = await query(updateQuery, [user_id]);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        updated_count: result.rowCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /v1/notifications/:id
 * Delete notification
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;

    const deleteQuery = `
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await query(deleteQuery, [id, user_id]);

    if (result.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.NOTIFICATION_NOT_FOUND.code,
        'NOTIFICATION_NOT_FOUND',
        'Notifikasi tidak ditemukan',
        'Periksa kembali ID notifikasi'
      );
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully',
      data: {
        deleted_id: result.rows[0].id
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /v1/notifications/settings
 * Get notification preferences
 */
export const getNotificationSettings = async (req, res, next) => {
  try {
    const user_id = req.user.id;

    const settingsQuery = `
      SELECT 
        enable_push_notifications,
        enable_email_notifications,
        enable_sms_notifications,
        notify_appointment_reminders,
        notify_appointment_confirmations,
        notify_appointment_cancellations,
        notify_chat_messages,
        notify_payment_updates,
        notify_promotions
      FROM notification_preferences
      WHERE user_id = $1
    `;

    const result = await query(settingsQuery, [user_id]);

    if (result.rows.length === 0) {
      // Return default settings if not set
      return res.json({
        success: true,
        data: {
          enable_push_notifications: true,
          enable_email_notifications: true,
          enable_sms_notifications: false,
          notify_appointment_reminders: true,
          notify_appointment_confirmations: true,
          notify_appointment_cancellations: true,
          notify_chat_messages: true,
          notify_payment_updates: true,
          notify_promotions: false
        }
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /v1/notifications/settings
 * Update notification preferences
 */
export const updateNotificationSettings = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const {
      enable_push_notifications,
      enable_email_notifications,
      enable_sms_notifications,
      notify_appointment_reminders,
      notify_appointment_confirmations,
      notify_appointment_cancellations,
      notify_chat_messages,
      notify_payment_updates,
      notify_promotions
    } = req.body;

    // Check if preferences exist
    const checkQuery = `
      SELECT id FROM notification_preferences WHERE user_id = $1
    `;
    const existing = await query(checkQuery, [user_id]);

    let result;

    if (existing.rows.length === 0) {
      // Insert new preferences
      const insertQuery = `
        INSERT INTO notification_preferences (
          user_id,
          enable_push_notifications,
          enable_email_notifications,
          enable_sms_notifications,
          notify_appointment_reminders,
          notify_appointment_confirmations,
          notify_appointment_cancellations,
          notify_chat_messages,
          notify_payment_updates,
          notify_promotions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      result = await query(insertQuery, [
        user_id,
        enable_push_notifications ?? true,
        enable_email_notifications ?? true,
        enable_sms_notifications ?? false,
        notify_appointment_reminders ?? true,
        notify_appointment_confirmations ?? true,
        notify_appointment_cancellations ?? true,
        notify_chat_messages ?? true,
        notify_payment_updates ?? true,
        notify_promotions ?? false
      ]);
    } else {
      // Update existing preferences
      const updates = [];
      const params = [];
      let paramIndex = 1;

      const fields = {
        enable_push_notifications,
        enable_email_notifications,
        enable_sms_notifications,
        notify_appointment_reminders,
        notify_appointment_confirmations,
        notify_appointment_cancellations,
        notify_chat_messages,
        notify_payment_updates,
        notify_promotions
      };

      for (const [field, value] of Object.entries(fields)) {
        if (value !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }

      if (updates.length === 0) {
        throw new APIError(
          ERROR_CODES.VALIDATION_ERROR.code,
          'VALIDATION_ERROR',
          'Tidak ada data untuk diupdate',
          'Berikan minimal satu setting untuk diupdate'
        );
      }

      const updateQuery = `
        UPDATE notification_preferences
        SET ${updates.join(', ')}
        WHERE user_id = $${paramIndex}
        RETURNING *
      `;
      params.push(user_id);
      result = await query(updateQuery, params);
    }

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};
