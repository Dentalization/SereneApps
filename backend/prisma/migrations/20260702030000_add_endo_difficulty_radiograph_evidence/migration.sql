CREATE TABLE endo_difficulty_assessments (
  id BIGSERIAL PRIMARY KEY,
  endo_case_detail_id BIGINT NOT NULL UNIQUE
    REFERENCES endo_case_details(id) ON DELETE CASCADE,
  patient_considerations JSONB DEFAULT '[]'::jsonb,
  diagnostic_considerations JSONB DEFAULT '[]'::jsonb,
  radiographic_considerations JSONB DEFAULT '[]'::jsonb,
  tooth_morphology_factors JSONB DEFAULT '[]'::jsonb,
  canal_morphology_factors JSONB DEFAULT '[]'::jsonb,
  previous_treatment_factors JSONB DEFAULT '[]'::jsonb,
  perio_endo_factors JSONB DEFAULT '[]'::jsonb,
  trauma_resorption_factors JSONB DEFAULT '[]'::jsonb,
  dentist_selected_difficulty VARCHAR(32),
  referral_considered BOOLEAN NOT NULL DEFAULT false,
  referral_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_endo_difficulty_assessments_level
    CHECK (
      dentist_selected_difficulty IS NULL
      OR dentist_selected_difficulty IN ('low', 'moderate', 'high')
    )
);

CREATE TABLE endo_radiograph_evidence (
  id BIGSERIAL PRIMARY KEY,
  endo_case_detail_id BIGINT NOT NULL
    REFERENCES endo_case_details(id) ON DELETE CASCADE,
  evidence_type VARCHAR(64) NOT NULL,
  xcore_study_id BIGINT NOT NULL
    REFERENCES imaging_studies(id) ON DELETE CASCADE,
  treatment_stage_id BIGINT
    REFERENCES endo_treatment_stages(id) ON DELETE SET NULL,
  notes TEXT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_endo_radiograph_evidence_type
    CHECK (
      evidence_type IN (
        'preoperative',
        'working_length',
        'master_cone',
        'obturation',
        'follow_up',
        'cbct'
      )
    ),
  CONSTRAINT uq_endo_radiograph_evidence_slot
    UNIQUE (endo_case_detail_id, evidence_type)
);

CREATE INDEX idx_endo_radiograph_evidence_case
  ON endo_radiograph_evidence(endo_case_detail_id);
CREATE INDEX idx_endo_radiograph_evidence_xcore_study
  ON endo_radiograph_evidence(xcore_study_id);
CREATE INDEX idx_endo_radiograph_evidence_type
  ON endo_radiograph_evidence(evidence_type);

CREATE TRIGGER update_endo_difficulty_assessments_updated_at
  BEFORE UPDATE ON endo_difficulty_assessments
  FOR EACH ROW EXECUTE FUNCTION set_specialist_workspace_updated_at();

CREATE TRIGGER update_endo_radiograph_evidence_updated_at
  BEFORE UPDATE ON endo_radiograph_evidence
  FOR EACH ROW EXECUTE FUNCTION set_specialist_workspace_updated_at();

COMMENT ON TABLE endo_difficulty_assessments IS
  'PHI: dentist-authored structured Endo-Core difficulty assessment.';
COMMENT ON TABLE endo_radiograph_evidence IS
  'PHI: dentist-authored Endo-Core evidence slots referencing X-Core studies.';
