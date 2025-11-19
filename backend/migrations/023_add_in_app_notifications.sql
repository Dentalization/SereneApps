-- Migration: Add notifications table for in-app notifications

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON notifications (user_id, is_read);

-- Add user_devices table if doesn't exist (for FCM tokens)
CREATE TABLE IF NOT EXISTS user_devices (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  device_type VARCHAR(20),
  device_name VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_device_token 
  ON user_devices (user_id, device_token);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_active 
  ON user_devices (user_id, is_active);

-- Extend notification_preferences with more columns
ALTER TABLE notification_preferences 
  ADD COLUMN IF NOT EXISTS enable_push_notifications BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS enable_email_notifications BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS enable_sms_notifications BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notify_appointment_reminders BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_appointment_confirmations BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_appointment_cancellations BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_chat_messages BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_payment_updates BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_promotions BOOLEAN DEFAULT FALSE;
