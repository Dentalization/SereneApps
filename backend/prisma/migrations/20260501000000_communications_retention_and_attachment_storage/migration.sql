ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(32),
  ADD COLUMN IF NOT EXISTS storage_bucket VARCHAR(191),
  ADD COLUMN IF NOT EXISTS storage_object_key VARCHAR(512),
  ADD COLUMN IF NOT EXISTS media_deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS media_scan_status VARCHAR(32),
  ADD COLUMN IF NOT EXISTS media_tombstone_reason VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_chat_messages_media_retention
  ON chat_messages(media_retention_until);

CREATE INDEX IF NOT EXISTS idx_chat_messages_storage_object_key
  ON chat_messages(storage_object_key);

ALTER TABLE appointment_clinical_summaries
  ADD COLUMN IF NOT EXISTS patient_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS patient_acknowledged_by_id BIGINT;

CREATE TABLE IF NOT EXISTS appointment_follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id BIGINT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  summary_id UUID REFERENCES appointment_clinical_summaries(id) ON DELETE SET NULL,
  dentist_id BIGINT NOT NULL,
  patient_id BIGINT NOT NULL,
  title VARCHAR(180) NOT NULL,
  notes TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_appointment_status
  ON appointment_follow_up_tasks(appointment_id, status);

CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_dentist_due
  ON appointment_follow_up_tasks(dentist_id, status, due_at);

CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_patient_due
  ON appointment_follow_up_tasks(patient_id, status, due_at);

ALTER TABLE appointment_communication_participants
  ADD COLUMN IF NOT EXISTS last_invite_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_by_id BIGINT,
  ADD COLUMN IF NOT EXISTS access_regenerated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_comm_participants_invite_expiry_active
  ON appointment_communication_participants(expires_at, status)
  WHERE status IN ('invited', 'verified');

-- Partial index keeps the retention worker fast without bloating write cost for non-attachment messages.
CREATE INDEX IF NOT EXISTS idx_chat_messages_expired_media_active
  ON chat_messages(media_retention_until)
  WHERE message_type = 'file' AND media_deleted_at IS NULL AND media_retention_until IS NOT NULL;
