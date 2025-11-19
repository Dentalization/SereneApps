-- Migration: create patient_profiles table to support mobile patient onboarding
-- Adds flexible JSON fields so we can evolve patient data without frequent schema churn

CREATE TABLE IF NOT EXISTS patient_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender TEXT,
  insurance_provider TEXT,
  insurance_number TEXT,
  insurance_member_id TEXT,
  emergency_contact JSONB,
  address JSONB,
  medical_details JSONB,
  preferred_language TEXT NOT NULL DEFAULT 'id',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_profiles_user_id ON patient_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_insurance_number ON patient_profiles(insurance_number);

COMMENT ON TABLE patient_profiles IS 'Stores extended profile attributes for patient accounts.';
COMMENT ON COLUMN patient_profiles.emergency_contact IS 'JSON payload storing name/phone/relationship fields.';
COMMENT ON COLUMN patient_profiles.address IS 'JSON payload for address lines, city, province, postal code.';
COMMENT ON COLUMN patient_profiles.medical_details IS 'JSON payload for allergies, medications, and notes.';
