-- Link Specialist Workspace cases to the actual X-Core ImagingStudy record.
-- This stores only the foreign-key reference; DICOM assets remain owned by X-Core.

ALTER TABLE specialist_cases
  ADD COLUMN xcore_study_id BIGINT;

ALTER TABLE specialist_cases
  ADD CONSTRAINT specialist_cases_xcore_study_id_fkey
  FOREIGN KEY (xcore_study_id)
  REFERENCES imaging_studies(id)
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

CREATE INDEX idx_specialist_cases_xcore_study
  ON specialist_cases (xcore_study_id);

COMMENT ON COLUMN specialist_cases.xcore_study_id IS
  'Reference to X-Core ImagingStudy; no DICOM or AI findings are copied into Specialist Workspace.';
