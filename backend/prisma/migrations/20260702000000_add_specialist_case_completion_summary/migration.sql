-- Dentist-approved Specialist Case completion boundary.
-- This summary remains in Specialist Workspace and is not copied to EMR.

ALTER TABLE specialist_cases
  ADD COLUMN completion_summary TEXT;

COMMENT ON COLUMN specialist_cases.completion_summary IS
  'PHI: dentist-approved completion summary; not an EMR record and never populated from raw working notes.';
