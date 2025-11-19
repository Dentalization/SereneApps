-- Migration: create appointments scheduling tables

CREATE TABLE IF NOT EXISTS appointments (
  id BIGSERIAL PRIMARY KEY,
  dentist_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clinic_branch_id BIGINT REFERENCES clinic_branches(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'scheduled',
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_starts_before_end,
  ADD CONSTRAINT appointments_starts_before_end CHECK (ends_at > starts_at);

CREATE INDEX IF NOT EXISTS idx_appointments_dentist_time
  ON appointments (dentist_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_time
  ON appointments (patient_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON appointments (status);
