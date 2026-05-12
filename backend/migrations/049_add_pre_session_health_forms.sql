CREATE TABLE IF NOT EXISTS appointment_pre_session_health_forms (
  id BIGSERIAL PRIMARY KEY,
  appointment_id BIGINT NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id BIGINT NOT NULL,
  symptoms TEXT,
  pain_level INTEGER,
  allergies TEXT,
  medications TEXT,
  notes TEXT,
  answers JSONB DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pre_session_health_forms_patient_submitted
  ON appointment_pre_session_health_forms (patient_id, submitted_at DESC);
