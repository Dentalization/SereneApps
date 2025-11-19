-- Add avatar_url column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add avatar_url column to dentist_profiles table if it doesn't exist  
ALTER TABLE dentist_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;