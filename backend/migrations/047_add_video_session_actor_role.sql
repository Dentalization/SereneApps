-- Distinguish clinical video participants from clinic observers for live-session reporting.

ALTER TABLE video_sessions
  ADD COLUMN IF NOT EXISTS actor_role VARCHAR(32) NOT NULL DEFAULT 'participant';

CREATE INDEX IF NOT EXISTS idx_video_sessions_appointment_actor_active
  ON video_sessions ("appointmentId", actor_role, "leftAt")
  WHERE "leftAt" IS NULL;
