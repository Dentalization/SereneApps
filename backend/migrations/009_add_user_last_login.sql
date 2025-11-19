-- Migration: Add last login tracking to users
-- Adds last_login_at column to capture user activity timestamps

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);

COMMENT ON COLUMN users.last_login_at IS 'Tracks the timestamp of the user''s most recent login.';
