-- Specialist Workspace Phase 0 + Phase 1.
-- Stores a radiology-linked working case without duplicating X-Core or EMR data.

CREATE TABLE specialist_cases (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  dentist_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  clinic_profile_id BIGINT REFERENCES clinic_profiles(id) ON DELETE SET NULL,
  clinic_branch_id BIGINT REFERENCES clinic_branches(id) ON DELETE SET NULL,
  origin_appointment_id BIGINT REFERENCES appointments(id) ON DELETE SET NULL,
  xcore_verified_case_id VARCHAR(64),
  case_type VARCHAR(32) NOT NULL DEFAULT 'radiology',
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  summary TEXT,
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT specialist_cases_case_type_check CHECK (case_type = 'radiology'),
  CONSTRAINT specialist_cases_status_check CHECK (
    status IN ('draft', 'active', 'completed', 'archived')
  ),
  CONSTRAINT specialist_cases_title_check CHECK (length(btrim(title)) > 0)
);

CREATE TABLE specialist_case_notes (
  id BIGSERIAL PRIMARY KEY,
  specialist_case_id BIGINT NOT NULL REFERENCES specialist_cases(id) ON DELETE CASCADE,
  author_dentist_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,
  is_amendment BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT specialist_case_notes_content_check CHECK (length(btrim(content)) > 0)
);

CREATE TABLE specialist_case_timeline_events (
  id BIGSERIAL PRIMARY KEY,
  specialist_case_id BIGINT NOT NULL REFERENCES specialist_cases(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(32),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_specialist_cases_patient
  ON specialist_cases (patient_id);
CREATE INDEX idx_specialist_cases_dentist
  ON specialist_cases (dentist_id);
CREATE INDEX idx_specialist_cases_clinic
  ON specialist_cases (clinic_profile_id);
CREATE INDEX idx_specialist_cases_branch
  ON specialist_cases (clinic_branch_id);
CREATE INDEX idx_specialist_cases_appointment
  ON specialist_cases (origin_appointment_id);
CREATE INDEX idx_specialist_cases_type_status
  ON specialist_cases (case_type, status);
CREATE INDEX idx_specialist_case_notes_case
  ON specialist_case_notes (specialist_case_id);
CREATE INDEX idx_specialist_case_notes_author
  ON specialist_case_notes (author_dentist_id);
CREATE INDEX idx_specialist_case_timeline_case_created
  ON specialist_case_timeline_events (specialist_case_id, created_at DESC);
CREATE INDEX idx_specialist_case_timeline_event
  ON specialist_case_timeline_events (event_type);

CREATE OR REPLACE FUNCTION set_specialist_workspace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_specialist_cases_updated_at
  BEFORE UPDATE ON specialist_cases
  FOR EACH ROW
  EXECUTE FUNCTION set_specialist_workspace_updated_at();

CREATE TRIGGER update_specialist_case_notes_updated_at
  BEFORE UPDATE ON specialist_case_notes
  FOR EACH ROW
  EXECUTE FUNCTION set_specialist_workspace_updated_at();

COMMENT ON TABLE specialist_cases IS
  'PHI: dentist-owned working clinical cases; not the official EMR and not an X-Core data copy.';
COMMENT ON COLUMN specialist_cases.patient_id IS 'PHI: patient identifier.';
COMMENT ON COLUMN specialist_cases.title IS 'PHI: clinical working case title.';
COMMENT ON COLUMN specialist_cases.summary IS 'PHI: clinical working summary.';
COMMENT ON COLUMN specialist_case_notes.content IS 'PHI: dentist-only clinical working note.';
COMMENT ON COLUMN specialist_case_timeline_events.metadata IS
  'PHI-sensitive audit metadata; never expose through clinic or admin APIs.';
