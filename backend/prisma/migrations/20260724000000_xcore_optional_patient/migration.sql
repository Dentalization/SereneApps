-- X-Core uploads may enter the dentist's private gallery before patient
-- assignment. Patient assignment remains an audited, explicit later action.
--
-- Forward-only migration. A rollback can restore NOT NULL only after every
-- unassigned study has first been assigned to a valid patient or deleted.
ALTER TABLE imaging_studies
  ALTER COLUMN patient_id DROP NOT NULL;

ALTER TABLE imaging_studies
  DROP CONSTRAINT IF EXISTS imaging_studies_patient_id_fkey;

ALTER TABLE imaging_studies
  ADD CONSTRAINT imaging_studies_patient_id_fkey
  FOREIGN KEY (patient_id)
  REFERENCES users(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
