-- Migration: Link clinic staff to clinics
-- This adds a clinic_id field to users table to associate staff with clinics

-- Add clinic_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_id BIGINT REFERENCES clinic_profiles(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON users(clinic_id);

-- Update existing staff to belong to the clinic
UPDATE users 
SET clinic_id = (SELECT id FROM clinic_profiles LIMIT 1)
WHERE roles && ARRAY['manager', 'front_office', 'nurse', 'cashier'];

-- Add comment
COMMENT ON COLUMN users.clinic_id IS 'Links staff members to their workplace clinic. NULL for owners, dentists, patients, and admin.';
