-- Migration: appointment lifecycle audit and metadata

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS cancellation_fee INTEGER NULL,
  ADD COLUMN IF NOT EXISTS rescheduled_from_id BIGINT NULL REFERENCES appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS appointment_status_history (
  id BIGSERIAL PRIMARY KEY,
  appointment_id BIGINT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  previous_status VARCHAR,
  new_status VARCHAR NOT NULL,
  changed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  changed_by_role VARCHAR,
  reason VARCHAR,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_status_history_appt
  ON appointment_status_history (appointment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointment_status_history_user
  ON appointment_status_history (changed_by);
