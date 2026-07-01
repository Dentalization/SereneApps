-- Move dentist EMR schema ownership out of runtime request handlers.
-- This migration is intentionally idempotent because older deployments may
-- already have this table from the legacy ensureSchema() path.
--
-- Rollback is intentionally forward-only: do not drop this PHI-bearing table.
-- If application rollback is required, retain the table and deploy a follow-up
-- migration for any compatible schema adjustment.

CREATE TABLE IF NOT EXISTS dentist_emr_records (
  id VARCHAR(64) PRIMARY KEY,
  dentist_id BIGINT NOT NULL,
  patient_user_id BIGINT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE dentist_emr_records
  ADD COLUMN IF NOT EXISTS patient_user_id BIGINT,
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dentist_emr_records_dentist_id_fkey'
      AND conrelid = 'dentist_emr_records'::regclass
  ) THEN
    ALTER TABLE dentist_emr_records
      ADD CONSTRAINT dentist_emr_records_dentist_id_fkey
      FOREIGN KEY (dentist_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dentist_emr_records_patient_user_id_fkey'
      AND conrelid = 'dentist_emr_records'::regclass
  ) THEN
    ALTER TABLE dentist_emr_records
      ADD CONSTRAINT dentist_emr_records_patient_user_id_fkey
      FOREIGN KEY (patient_user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dentist_emr_records_dentist
  ON dentist_emr_records (dentist_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_dentist_emr_records_patient
  ON dentist_emr_records (patient_user_id);

CREATE OR REPLACE FUNCTION set_dentist_emr_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_dentist_emr_records_updated_at
  ON dentist_emr_records;

CREATE TRIGGER update_dentist_emr_records_updated_at
  BEFORE UPDATE ON dentist_emr_records
  FOR EACH ROW
  EXECUTE FUNCTION set_dentist_emr_records_updated_at();
