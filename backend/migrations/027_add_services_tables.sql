-- Migration: Add Services Tables
-- Description: Create tables for clinic services, dentist services, and service assignments
-- Date: 2025-11-21

-- ============================================
-- TABLE: clinic_services
-- Purpose: Store general clinic-level services
-- Managed by: Clinic owners/managers
-- ============================================
CREATE TABLE IF NOT EXISTS clinic_services (
  id BIGSERIAL PRIMARY KEY,
  clinic_branch_id BIGINT NOT NULL REFERENCES clinic_branches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general', -- 'general', 'specialist'
  specialty VARCHAR(100), -- NULL for general, 'orthodontics', 'periodontics', etc for specialist
  duration_minutes INTEGER DEFAULT 30, -- Estimated duration
  is_active BOOLEAN DEFAULT true,
  is_available_for_all_dentists BOOLEAN DEFAULT true, -- If true, all dentists can perform
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_clinic_services_branch ON clinic_services(clinic_branch_id);
CREATE INDEX IF NOT EXISTS idx_clinic_services_category ON clinic_services(category);
CREATE INDEX IF NOT EXISTS idx_clinic_services_active ON clinic_services(is_active);

-- ============================================
-- TABLE: dentist_services
-- Purpose: Store dentist-specific services (for independent dentists OR specialist services)
-- Managed by: Independent dentists OR clinic for their dentists
-- ============================================
CREATE TABLE IF NOT EXISTS dentist_services (
  id BIGSERIAL PRIMARY KEY,
  dentist_profile_id BIGINT NOT NULL REFERENCES dentist_profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'specialist', -- 'general', 'specialist'
  specialty VARCHAR(100), -- Related specialty
  duration_minutes INTEGER DEFAULT 30,
  managed_by VARCHAR(20) NOT NULL DEFAULT 'dentist', -- 'dentist' or 'clinic'
  can_edit BOOLEAN DEFAULT true, -- Independent dentist can edit, clinic dentist cannot
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_dentist_services_dentist ON dentist_services(dentist_profile_id);
CREATE INDEX IF NOT EXISTS idx_dentist_services_category ON dentist_services(category);
CREATE INDEX IF NOT EXISTS idx_dentist_services_active ON dentist_services(is_active);

-- ============================================
-- TABLE: service_dentist_assignments
-- Purpose: Assign clinic services to specific dentists with optional custom pricing
-- ============================================
CREATE TABLE IF NOT EXISTS service_dentist_assignments (
  id BIGSERIAL PRIMARY KEY,
  clinic_service_id BIGINT NOT NULL REFERENCES clinic_services(id) ON DELETE CASCADE,
  dentist_profile_id BIGINT NOT NULL REFERENCES dentist_profiles(id) ON DELETE CASCADE,
  custom_price DECIMAL(10,2), -- NULL means use base_price from clinic_services
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_service_id, dentist_profile_id) -- One assignment per service per dentist
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_service_assignments_clinic_service ON service_dentist_assignments(clinic_service_id);
CREATE INDEX IF NOT EXISTS idx_service_assignments_dentist ON service_dentist_assignments(dentist_profile_id);

-- ============================================
-- TABLE: clinic_gallery
-- Purpose: Store clinic photos (hero images, facility photos, etc)
-- ============================================
CREATE TABLE IF NOT EXISTS clinic_gallery (
  id BIGSERIAL PRIMARY KEY,
  clinic_branch_id BIGINT NOT NULL REFERENCES clinic_branches(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type VARCHAR(50) NOT NULL DEFAULT 'general', -- 'hero', 'cover', 'facility', 'general'
  caption TEXT,
  display_order INTEGER DEFAULT 0, -- For sorting images
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_clinic_gallery_branch ON clinic_gallery(clinic_branch_id);
CREATE INDEX IF NOT EXISTS idx_clinic_gallery_type ON clinic_gallery(image_type);
CREATE INDEX IF NOT EXISTS idx_clinic_gallery_order ON clinic_gallery(display_order);

-- ============================================
-- TABLE: clinic_highlights
-- Purpose: Store clinic highlights/features
-- ============================================
CREATE TABLE IF NOT EXISTS clinic_highlights (
  id BIGSERIAL PRIMARY KEY,
  clinic_branch_id BIGINT NOT NULL REFERENCES clinic_branches(id) ON DELETE CASCADE,
  highlight_text VARCHAR(255) NOT NULL,
  icon VARCHAR(100), -- Optional icon name (e.g., 'tooth-3d', 'child-friendly')
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_clinic_highlights_branch ON clinic_highlights(clinic_branch_id);
CREATE INDEX IF NOT EXISTS idx_clinic_highlights_order ON clinic_highlights(display_order);

-- ============================================
-- TABLE: clinic_facilities
-- Purpose: Store clinic facilities descriptions
-- ============================================
CREATE TABLE IF NOT EXISTS clinic_facilities (
  id BIGSERIAL PRIMARY KEY,
  clinic_branch_id BIGINT NOT NULL REFERENCES clinic_branches(id) ON DELETE CASCADE,
  facility_name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100), -- Optional icon name
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_clinic_facilities_branch ON clinic_facilities(clinic_branch_id);
CREATE INDEX IF NOT EXISTS idx_clinic_facilities_order ON clinic_facilities(display_order);

-- ============================================
-- TRIGGERS: Auto-update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all new tables
CREATE TRIGGER update_clinic_services_updated_at BEFORE UPDATE ON clinic_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dentist_services_updated_at BEFORE UPDATE ON dentist_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_assignments_updated_at BEFORE UPDATE ON service_dentist_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinic_gallery_updated_at BEFORE UPDATE ON clinic_gallery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinic_highlights_updated_at BEFORE UPDATE ON clinic_highlights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinic_facilities_updated_at BEFORE UPDATE ON clinic_facilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA: Add sample services for testing
-- ============================================
-- Note: This will be executed only if the tables are empty
-- You can remove this section if you don't want seed data

COMMENT ON TABLE clinic_services IS 'Clinic-level services managed by clinic owners/managers';
COMMENT ON TABLE dentist_services IS 'Dentist-specific services for independent dentists or specialist services';
COMMENT ON TABLE service_dentist_assignments IS 'Assignment of clinic services to specific dentists';
COMMENT ON TABLE clinic_gallery IS 'Clinic photos and images for public profile';
COMMENT ON TABLE clinic_highlights IS 'Clinic highlights and key features';
COMMENT ON TABLE clinic_facilities IS 'Clinic facilities and amenities';
