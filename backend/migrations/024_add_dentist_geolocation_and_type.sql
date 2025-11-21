-- Add geolocation and dentist type to dentist_profiles
-- Migration: 024_add_dentist_geolocation_and_type.sql

-- Add geolocation columns
ALTER TABLE dentist_profiles 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add location details
ALTER TABLE dentist_profiles
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Add dentist type: 'independent' or 'clinic'
ALTER TABLE dentist_profiles
ADD COLUMN IF NOT EXISTS dentist_type TEXT NOT NULL DEFAULT 'independent' CHECK (dentist_type IN ('independent', 'clinic'));

-- Add clinic-specific fields (only for clinic type)
ALTER TABLE dentist_profiles
ADD COLUMN IF NOT EXISTS clinic_id BIGINT,
ADD COLUMN IF NOT EXISTS is_clinic_owner BOOLEAN DEFAULT false;

-- Create spatial index for efficient nearby search
CREATE INDEX IF NOT EXISTS idx_dentist_location ON dentist_profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_dentist_city_district ON dentist_profiles(city, district);
CREATE INDEX IF NOT EXISTS idx_dentist_type ON dentist_profiles(dentist_type);
CREATE INDEX IF NOT EXISTS idx_dentist_clinic_id ON dentist_profiles(clinic_id);

-- Add comments
COMMENT ON COLUMN dentist_profiles.latitude IS 'Latitude coordinate for geolocation (WGS84)';
COMMENT ON COLUMN dentist_profiles.longitude IS 'Longitude coordinate for geolocation (WGS84)';
COMMENT ON COLUMN dentist_profiles.dentist_type IS 'Type: independent (solo practice) or clinic (part of clinic)';
COMMENT ON COLUMN dentist_profiles.clinic_id IS 'Reference to clinic if dentist_type is clinic';
COMMENT ON COLUMN dentist_profiles.is_clinic_owner IS 'True if dentist owns the clinic';

-- Create clinics table if not exists
CREATE TABLE IF NOT EXISTS clinics (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  province TEXT,
  postal_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone_number TEXT,
  email TEXT,
  website TEXT,
  operating_hours JSONB, -- {"monday": "09:00-17:00", ...}
  facilities TEXT[], -- ["Parking", "WiFi", "Wheelchair Access"]
  total_dentists INTEGER DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for clinics
CREATE INDEX IF NOT EXISTS idx_clinic_location ON clinics(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_clinic_city ON clinics(city, district);

-- Update trigger for clinic's total_dentists count
CREATE OR REPLACE FUNCTION update_clinic_dentist_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.clinic_id IS NOT NULL THEN
    UPDATE clinics SET total_dentists = total_dentists + 1 WHERE id = NEW.clinic_id;
  ELSIF TG_OP = 'DELETE' AND OLD.clinic_id IS NOT NULL THEN
    UPDATE clinics SET total_dentists = total_dentists - 1 WHERE id = OLD.clinic_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.clinic_id IS NOT NULL AND OLD.clinic_id != NEW.clinic_id THEN
      UPDATE clinics SET total_dentists = total_dentists - 1 WHERE id = OLD.clinic_id;
    END IF;
    IF NEW.clinic_id IS NOT NULL AND OLD.clinic_id != NEW.clinic_id THEN
      UPDATE clinics SET total_dentists = total_dentists + 1 WHERE id = NEW.clinic_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_clinic_dentist_count ON dentist_profiles;
CREATE TRIGGER trigger_update_clinic_dentist_count
AFTER INSERT OR UPDATE OR DELETE ON dentist_profiles
FOR EACH ROW EXECUTE FUNCTION update_clinic_dentist_count();

