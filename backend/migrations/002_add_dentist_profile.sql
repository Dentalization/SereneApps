-- Add phone number to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS about TEXT;

-- Create dentist_profiles table for professional information
CREATE TABLE IF NOT EXISTS dentist_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Professional Information
  title TEXT NOT NULL, -- drg., Sp.Ort., etc.
  license_number TEXT NOT NULL, -- SIP number
  license_issuing_body TEXT NOT NULL,
  license_expiry_date DATE NOT NULL,
  registration_number TEXT NOT NULL, -- STR number
  primary_specialization TEXT NOT NULL,
  education_qualification TEXT NOT NULL,
  years_of_experience INTEGER NOT NULL CHECK (years_of_experience >= 0 AND years_of_experience <= 60),
  
  -- Clinic Information
  clinic_name TEXT NOT NULL,
  clinic_address TEXT NOT NULL,
  clinic_working_hours TEXT NOT NULL,
  consultation_types TEXT[] NOT NULL DEFAULT array[]::text[],
  services_offered TEXT[] NOT NULL DEFAULT array[]::text[],
  
  -- Optional Information
  consultation_fee INTEGER, -- in IDR
  accepts_insurance BOOLEAN NOT NULL DEFAULT false,
  accepts_bpjs BOOLEAN NOT NULL DEFAULT false,
  emergency_availability BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraints
  UNIQUE(license_number),
  UNIQUE(registration_number)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_dentist_profiles_user_id ON dentist_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_dentist_profiles_license_number ON dentist_profiles(license_number);
CREATE INDEX IF NOT EXISTS idx_dentist_profiles_registration_number ON dentist_profiles(registration_number);
CREATE INDEX IF NOT EXISTS idx_dentist_profiles_specialization ON dentist_profiles(primary_specialization);
