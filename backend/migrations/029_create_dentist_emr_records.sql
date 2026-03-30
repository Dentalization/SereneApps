-- Migration: Dentist EMR Records storage

CREATE TABLE IF NOT EXISTS dentist_emr_records (
  id VARCHAR(64) PRIMARY KEY,
  dentist_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dentist_emr_records_dentist
  ON dentist_emr_records (dentist_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_dentist_emr_records_patient
  ON dentist_emr_records (patient_user_id);

DROP TRIGGER IF EXISTS update_dentist_emr_records_updated_at ON dentist_emr_records;
CREATE TRIGGER update_dentist_emr_records_updated_at
  BEFORE UPDATE ON dentist_emr_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
