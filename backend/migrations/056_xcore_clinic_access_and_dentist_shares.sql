-- Migration: Restricted clinic X-Core access and same-clinic dentist sharing

ALTER TABLE clinic_staff
  DROP CONSTRAINT IF EXISTS clinic_staff_role_check;

ALTER TABLE clinic_staff
  ADD CONSTRAINT clinic_staff_role_check
  CHECK (
    role IN (
      'owner',
      'clinic_owner',
      'manager',
      'clinic_manager',
      'front_office',
      'nurse',
      'cashier',
      'admin',
      'clinic_admin',
      'clinic_admin_xcore',
      'clinical_director',
      'authorized_clinic_doctor',
      'dentist',
      'staff',
      'clinic_staff'
    )
  );

CREATE TABLE IF NOT EXISTS study_dentist_shares (
  id BIGSERIAL PRIMARY KEY,
  study_id BIGINT NOT NULL,
  owner_dentist_id BIGINT NOT NULL,
  recipient_dentist_id BIGINT NOT NULL,
  created_by BIGINT NOT NULL,
  revoked_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,

  CONSTRAINT fk_study_dentist_shares_study
    FOREIGN KEY (study_id) REFERENCES imaging_studies(id) ON DELETE CASCADE,
  CONSTRAINT fk_study_dentist_shares_owner
    FOREIGN KEY (owner_dentist_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_study_dentist_shares_recipient
    FOREIGN KEY (recipient_dentist_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_study_dentist_shares_created_by
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_study_dentist_shares_distinct_dentists
    CHECK (owner_dentist_id <> recipient_dentist_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_study_dentist_recipient
  ON study_dentist_shares(study_id, recipient_dentist_id);

CREATE INDEX IF NOT EXISTS idx_study_dentist_shares_study
  ON study_dentist_shares(study_id);

CREATE INDEX IF NOT EXISTS idx_study_dentist_shares_owner
  ON study_dentist_shares(owner_dentist_id);

CREATE INDEX IF NOT EXISTS idx_study_dentist_shares_recipient_active
  ON study_dentist_shares(recipient_dentist_id, revoked_at);

COMMENT ON TABLE study_dentist_shares IS 'Authenticated X-Core study shares between active dentists in the same clinic';
