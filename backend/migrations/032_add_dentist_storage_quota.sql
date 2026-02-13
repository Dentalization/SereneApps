-- Migration: Add storage quota fields to dentist_profiles
-- Description: Add storage_usage and storage_limit columns for X-Core storage management

ALTER TABLE dentist_profiles 
ADD COLUMN IF NOT EXISTS storage_usage BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_limit BIGINT DEFAULT 10737418240; -- 10 GB default

-- Add comment for documentation
COMMENT ON COLUMN dentist_profiles.storage_usage IS 'Current storage usage in bytes';
COMMENT ON COLUMN dentist_profiles.storage_limit IS 'Storage limit in bytes (default 10GB)';
