import express from 'express';
import { authenticateToken } from '../utils/tokens.js';
import {
  registerNotificationDevice,
  deactivateNotificationDevice,
  listNotificationPreferences,
  updateNotificationPreferences
} from '../services/notifications/index.js';
import { NOTIFICATION_CHANNELS, NOTIFICATION_EVENTS } from '../services/notifications/templates.js';
import {
  registerDevice,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationSettings,
  updateNotificationSettings
} from '../controllers/notificationsController.js';

const router = express.Router();

router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const preferences = await listNotificationPreferences(req.user.id);
    res.json({ preferences, channels: NOTIFICATION_CHANNELS, events: NOTIFICATION_EVENTS });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

router.put('/preferences', authenticateToken, express.json(), async (req, res) => {
  try {
    const incoming = Array.isArray(req.body?.preferences) ? req.body.preferences : [];
    const filtered = incoming
      .filter((item) => NOTIFICATION_EVENTS.includes(item.eventType) && NOTIFICATION_CHANNELS.includes(item.channel))
      .map((item) => ({
        eventType: item.eventType,
        channel: item.channel,
        enabled: Boolean(item.enabled),
        metadata: item.metadata ?? {}
      }));

    const preferences = await updateNotificationPreferences(req.user.id, filtered);
    res.json({ preferences });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

router.post('/devices', authenticateToken, express.json(), async (req, res) => {
  try {
    const { token, provider = 'fcm', platform = 'unknown', metadata = {} } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }
    await registerNotificationDevice({
      userId: req.user.id,
      token,
      provider,
      platform,
      metadata
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Error registering notification device:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

router.delete('/devices/:token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.params;
    const provider = req.query.provider || 'fcm';
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }
    await deactivateNotificationDevice({ token, provider });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deactivating notification device:', error);
    res.status(500).json({ error: 'Failed to deactivate device' });
  }
});

// ============================================================================
// IN-APP NOTIFICATIONS ENDPOINTS
// ============================================================================

// Register FCM device token
router.post('/register-device', authenticateToken, registerDevice);

// Get user's notifications (inbox)
router.get('/', authenticateToken, getNotifications);

// Mark notification as read
router.patch('/:id/read', authenticateToken, markAsRead);

// Mark all notifications as read
router.patch('/read-all', authenticateToken, markAllAsRead);

// Delete notification
router.delete('/:id', authenticateToken, deleteNotification);

// Get notification settings
router.get('/settings', authenticateToken, getNotificationSettings);

// Update notification settings
router.patch('/settings', authenticateToken, updateNotificationSettings);

// Send appointment reminder to patient
router.post('/send-appointment-reminder', authenticateToken, async (req, res) => {
  try {
    const { appointmentId, patientId } = req.body;
    
    if (!appointmentId || !patientId) {
      return res.status(400).json({ 
        success: false, 
        error: 'appointmentId and patientId are required' 
      });
    }

    // Create in-app notification for patient
    const insertQuery = `
      INSERT INTO notifications (
        user_id, 
        type, 
        title, 
        message, 
        data,
        is_read
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const { query: dbQuery } = await import('../db.js');
    const result = await dbQuery(insertQuery, [
      patientId,
      'appointment_reminder',
      '⏰ Appointment Reminder',
      'You have an upcoming appointment. Please don\'t forget to attend!',
      JSON.stringify({ appointmentId }),
      false
    ]);

    console.log('✅ Appointment reminder sent to patient:', patientId);

    res.json({
      success: true,
      message: 'Reminder sent successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error sending appointment reminder:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send reminder',
      message: error.message 
    });
  }
});

export default router;
