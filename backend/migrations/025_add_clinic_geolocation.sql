-- Add geolocation to clinic_profiles and clinic_branches
-- Migration: 025_add_clinic_geolocation.sql

-- Add geolocation to clinic_profiles (main clinic)
-- Note: province and postal_code already exist from migration 006, so we only add new columns
ALTER TABLE clinic_profiles
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS district VARCHAR;

-- Add geolocation to clinic_branches
-- Note: province and postal_code already exist from migration 006, so we only add new columns
ALTER TABLE clinic_branches
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS district VARCHAR;

-- Create spatial indexes for clinic locations
CREATE INDEX IF NOT EXISTS idx_clinic_profiles_location ON clinic_profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_clinic_profiles_city ON clinic_profiles(city, district);
CREATE INDEX IF NOT EXISTS idx_clinic_branches_location ON clinic_branches(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_clinic_branches_city ON clinic_branches(city, district);

-- Add comments
COMMENT ON COLUMN clinic_profiles.latitude IS 'Latitude coordinate for clinic main location (WGS84)';
COMMENT ON COLUMN clinic_profiles.longitude IS 'Longitude coordinate for clinic main location (WGS84)';
COMMENT ON COLUMN clinic_profiles.district IS 'District/Kecamatan where clinic is located';
COMMENT ON COLUMN clinic_branches.latitude IS 'Latitude coordinate for branch location (WGS84)';
COMMENT ON COLUMN clinic_branches.longitude IS 'Longitude coordinate for branch location (WGS84)';
COMMENT ON COLUMN clinic_branches.district IS 'District/Kecamatan where branch is located';
