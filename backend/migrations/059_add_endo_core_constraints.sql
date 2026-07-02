ALTER TABLE endo_case_details
  ADD CONSTRAINT chk_endo_case_details_tooth_number
  CHECK (tooth_number IN (
    '18','17','16','15','14','13','12','11',
    '21','22','23','24','25','26','27','28',
    '38','37','36','35','34','33','32','31',
    '41','42','43','44','45','46','47','48'
  ));

ALTER TABLE endo_case_details
  ADD CONSTRAINT chk_endo_case_details_difficulty_level
  CHECK (difficulty_level IS NULL OR difficulty_level IN ('low', 'moderate', 'high'));

ALTER TABLE endo_diagnostic_tests
  ADD CONSTRAINT chk_endo_diagnostic_tests_test_type
  CHECK (test_type IN ('cold', 'percussion', 'palpation', 'mobility', 'probing'));

ALTER TABLE endo_treatment_stages
  ADD CONSTRAINT chk_endo_treatment_stages_stage_type
  CHECK (stage_type IN ('assessment', 'access', 'working_length', 'cleaning_shaping', 'medication', 'obturation', 'restoration', 'follow_up'));

ALTER TABLE endo_treatment_stages
  ADD CONSTRAINT chk_endo_treatment_stages_status
  CHECK (status IN ('planned', 'in_progress', 'completed', 'skipped'));
