-- Auditable patient assignment history for X-Core imaging studies.

CREATE TABLE imaging_study_patient_assignments (
  id BIGSERIAL PRIMARY KEY,
  study_id BIGINT NOT NULL
    REFERENCES imaging_studies(id) ON DELETE CASCADE,
  previous_patient_id BIGINT
    REFERENCES users(id) ON DELETE SET NULL,
  patient_id BIGINT NOT NULL
    REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by_dentist_id BIGINT NOT NULL
    REFERENCES users(id) ON DELETE RESTRICT,
  source VARCHAR(24) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT imaging_study_patient_assignments_source_check
    CHECK (source IN ('upload', 'manual'))
);

CREATE INDEX idx_imaging_study_patient_assignments_study
  ON imaging_study_patient_assignments (study_id, created_at DESC);
CREATE INDEX idx_imaging_study_patient_assignments_patient
  ON imaging_study_patient_assignments (patient_id);
CREATE INDEX idx_imaging_study_patient_assignments_dentist
  ON imaging_study_patient_assignments (assigned_by_dentist_id);

COMMENT ON TABLE imaging_study_patient_assignments IS
  'PHI audit history for assigning X-Core imaging studies to patients.';
