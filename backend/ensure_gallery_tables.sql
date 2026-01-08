-- ============================================
-- ENSURE GALLERY, HIGHLIGHTS, FACILITIES TABLES
-- ============================================
-- Run this script if migration 027 hasn't been applied
-- This ensures clinic gallery, highlights, and facilities tables exist

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

-- Apply triggers to new tables
DROP TRIGGER IF EXISTS update_clinic_gallery_updated_at ON clinic_gallery;
CREATE TRIGGER update_clinic_gallery_updated_at BEFORE UPDATE ON clinic_gallery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clinic_highlights_updated_at ON clinic_highlights;
CREATE TRIGGER update_clinic_highlights_updated_at BEFORE UPDATE ON clinic_highlights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clinic_facilities_updated_at ON clinic_facilities;
CREATE TRIGGER update_clinic_facilities_updated_at BEFORE UPDATE ON clinic_facilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA: Add sample gallery, highlights, facilities for testing
-- ============================================
-- These are optional. Only uncomment if you want sample data

-- Sample gallery images
-- INSERT INTO clinic_gallery (clinic_branch_id, image_url, image_type, display_order, is_active)
-- SELECT id, 'https://via.placeholder.com/400x300?text=Clinic', 'hero', 1, true
-- FROM clinic_branches LIMIT 1;

-- Sample highlights
-- INSERT INTO clinic_highlights (clinic_branch_id, highlight_text, icon, display_order, is_active)
-- SELECT id, 'Peralatan Modern', 'medical-equipment', 1, true
-- FROM clinic_branches WHERE is_active = true LIMIT 1;

-- Sample facilities
-- INSERT INTO clinic_facilities (clinic_branch_id, facility_name, description, icon, display_order, is_active)
-- SELECT id, 'Ruang Tunggu Nyaman', 'Ruang tunggu berAC dengan WiFi gratis', 'sofa', 1, true
-- FROM clinic_branches WHERE is_active = true LIMIT 1;

COMMIT;
