-- Communication audit timeline and safer long-term message attachment projection.

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(120),
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS media_retention_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_chat_messages_retention
  ON chat_messages (media_retention_until)
  WHERE media_retention_until IS NOT NULL;

CREATE TABLE IF NOT EXISTS communication_events (
  id BIGSERIAL PRIMARY KEY,
  appointment_id BIGINT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id BIGINT,
  event_type VARCHAR(64) NOT NULL,
  provider VARCHAR(32),
  provider_event_id VARCHAR(191),
  resource_sid VARCHAR(191),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uniq_communication_events_provider_event UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_communication_events_appointment_time
  ON communication_events (appointment_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_communication_events_type_time
  ON communication_events (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_communication_events_user_time
  ON communication_events (user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS video_sessions (
  id BIGSERIAL PRIMARY KEY,
  "appointmentId" BIGINT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  "userId" BIGINT NOT NULL,
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "leftAt" TIMESTAMPTZ,
  "durationSeconds" INTEGER
);

CREATE INDEX IF NOT EXISTS idx_video_sessions_appointment_active
  ON video_sessions ("appointmentId", "leftAt")
  WHERE "leftAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_video_sessions_user_time
  ON video_sessions ("userId", "joinedAt" DESC);
