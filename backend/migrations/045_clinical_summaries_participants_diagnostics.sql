CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE communication_events
  ADD COLUMN IF NOT EXISTS actor_role VARCHAR(32),
  ADD COLUMN IF NOT EXISTS provider_sid VARCHAR(191);

ALTER TABLE chat_messages
  ALTER COLUMN sender_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS sender_communication_participant_id UUID;

CREATE TABLE IF NOT EXISTS appointment_clinical_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id BIGINT NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  dentist_id BIGINT NOT NULL,
  patient_id BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  chief_complaint TEXT,
  subjective_notes TEXT,
  objective_findings TEXT,
  assessment TEXT,
  plan TEXT,
  diagnosis_codes JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  follow_up_needed BOOLEAN NOT NULL DEFAULT false,
  follow_up_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  amended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_summaries_dentist_status
  ON appointment_clinical_summaries(dentist_id, status);

CREATE INDEX IF NOT EXISTS idx_clinical_summaries_patient_status
  ON appointment_clinical_summaries(patient_id, status);

CREATE TABLE IF NOT EXISTS appointment_communication_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id BIGINT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  display_name VARCHAR(160) NOT NULL,
  email VARCHAR(191),
  phone VARCHAR(40),
  role VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'invited',
  invite_token_hash VARCHAR(128) UNIQUE,
  invited_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_participants_appointment_role_status
  ON appointment_communication_participants(appointment_id, role, status);

CREATE INDEX IF NOT EXISTS idx_comm_participants_user_status
  ON appointment_communication_participants(user_id, status);

CREATE INDEX IF NOT EXISTS idx_comm_participants_expires_at
  ON appointment_communication_participants(expires_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_messages_sender_communication_participant_id_fkey'
  ) THEN
    ALTER TABLE chat_messages
      ADD CONSTRAINT chat_messages_sender_communication_participant_id_fkey
      FOREIGN KEY (sender_communication_participant_id)
      REFERENCES appointment_communication_participants(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_messages_comm_participant
  ON chat_messages(sender_communication_participant_id, created_at DESC);
