ALTER TABLE specialist_cases
  DROP CONSTRAINT IF EXISTS specialist_cases_case_type_check;
ALTER TABLE specialist_cases
  ADD CONSTRAINT specialist_cases_case_type_check
  CHECK (case_type IN ('radiology', 'endodontic'));

CREATE TABLE endo_case_details (
  id BIGSERIAL PRIMARY KEY,
  specialist_case_id BIGINT NOT NULL UNIQUE REFERENCES specialist_cases(id) ON DELETE CASCADE,
  tooth_number VARCHAR(2) NOT NULL,
  odontogram_position VARCHAR(16),
  odontogram_code_at_creation VARCHAR(32),
  chief_complaint TEXT NOT NULL,
  pulp_diagnosis TEXT,
  periapical_diagnosis TEXT,
  swelling BOOLEAN NOT NULL DEFAULT false,
  sinus_tract BOOLEAN NOT NULL DEFAULT false,
  spontaneous_pain BOOLEAN,
  lingering_pain BOOLEAN,
  thermal_sensitivity BOOLEAN,
  biting_pain BOOLEAN,
  difficulty_level VARCHAR(32),
  difficulty_factors JSONB DEFAULT '[]'::jsonb,
  previous_endo_treatment BOOLEAN NOT NULL DEFAULT false,
  retreatment_reason TEXT,
  restorability_status VARCHAR(64),
  final_restoration_status VARCHAR(64),
  trauma_history TEXT,
  periodontal_concern TEXT,
  cbct_considered BOOLEAN NOT NULL DEFAULT false,
  cbct_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE endo_diagnostic_tests (
  id BIGSERIAL PRIMARY KEY,
  endo_case_detail_id BIGINT NOT NULL REFERENCES endo_case_details(id) ON DELETE CASCADE,
  test_type VARCHAR(32) NOT NULL,
  result VARCHAR(128),
  notes TEXT,
  performed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE endo_treatment_stages (
  id BIGSERIAL PRIMARY KEY,
  endo_case_detail_id BIGINT NOT NULL REFERENCES endo_case_details(id) ON DELETE CASCADE,
  stage_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'planned',
  performed_at TIMESTAMPTZ,
  appointment_id BIGINT REFERENCES appointments(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_endo_case_details_tooth ON endo_case_details(tooth_number);
CREATE INDEX idx_endo_diagnostic_tests_case ON endo_diagnostic_tests(endo_case_detail_id);
CREATE INDEX idx_endo_diagnostic_tests_type ON endo_diagnostic_tests(test_type);
CREATE INDEX idx_endo_treatment_stages_case ON endo_treatment_stages(endo_case_detail_id);
CREATE INDEX idx_endo_treatment_stages_type ON endo_treatment_stages(stage_type);
CREATE INDEX idx_endo_treatment_stages_appointment ON endo_treatment_stages(appointment_id);

CREATE TRIGGER update_endo_case_details_updated_at
  BEFORE UPDATE ON endo_case_details FOR EACH ROW
  EXECUTE FUNCTION set_specialist_workspace_updated_at();
CREATE TRIGGER update_endo_diagnostic_tests_updated_at
  BEFORE UPDATE ON endo_diagnostic_tests FOR EACH ROW
  EXECUTE FUNCTION set_specialist_workspace_updated_at();
CREATE TRIGGER update_endo_treatment_stages_updated_at
  BEFORE UPDATE ON endo_treatment_stages FOR EACH ROW
  EXECUTE FUNCTION set_specialist_workspace_updated_at();

COMMENT ON TABLE endo_case_details IS 'PHI: Endo-Core detail attached to SpecialistCase.';
COMMENT ON TABLE endo_diagnostic_tests IS 'PHI: dentist-authored endodontic diagnostic test documentation.';
COMMENT ON TABLE endo_treatment_stages IS 'PHI: dentist-authored RCT workflow documentation.';
