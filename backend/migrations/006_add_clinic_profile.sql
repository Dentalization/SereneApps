-- Migration: Add Clinic Profile tables
-- Created: 2025-01-19
-- Description: Add comprehensive clinic profile system with branches

CREATE TABLE IF NOT EXISTS clinic_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Profil Klinik
    legal_name VARCHAR NOT NULL,
    brand_name VARCHAR,
    facility_type VARCHAR NOT NULL CHECK (facility_type IN ('klinik_gigi', 'rsgm')),
    
    -- Alamat
    street_address VARCHAR NOT NULL,
    city VARCHAR NOT NULL,
    province VARCHAR NOT NULL,
    postal_code VARCHAR NOT NULL,
    phone VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    timezone VARCHAR NOT NULL DEFAULT 'Asia/Jakarta',
    
    -- Jam Operasional (JSON format)
    operating_hours JSONB NOT NULL,
    
    -- Penanggung Jawab (PIC/Owner)
    owner_name VARCHAR NOT NULL,
    owner_position VARCHAR NOT NULL CHECK (owner_position IN ('owner', 'manager')),
    owner_email VARCHAR NOT NULL,
    owner_whatsapp VARCHAR NOT NULL,
    owner_nik VARCHAR NOT NULL UNIQUE,
    
    -- Dokumen PIC
    ktp_file_path VARCHAR NOT NULL,
    ktp_selfie_file_path VARCHAR,
    
    -- Dokumen Legal
    nib_number VARCHAR NOT NULL UNIQUE,
    nib_file_path VARCHAR NOT NULL,
    npwp_number VARCHAR NOT NULL UNIQUE,
    npwp_file_path VARCHAR NOT NULL,
    operational_license_file_path VARCHAR NOT NULL,
    additional_license_file_paths TEXT[] DEFAULT '{}',
    
    -- Kebijakan Privasi & Persetujuan
    terms_accepted BOOLEAN NOT NULL DEFAULT false,
    privacy_accepted BOOLEAN NOT NULL DEFAULT false,
    data_protection_contact VARCHAR,
    
    -- Status & Verifikasi
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verification_date TIMESTAMPTZ,
    verification_notes TEXT,
    status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'suspended')),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinic_branches (
    id BIGSERIAL PRIMARY KEY,
    clinic_profile_id BIGINT NOT NULL REFERENCES clinic_profiles(id) ON DELETE CASCADE,
    
    -- Informasi Cabang
    branch_name VARCHAR NOT NULL,
    branch_code VARCHAR,
    is_main_branch BOOLEAN NOT NULL DEFAULT false,
    
    -- Alamat Cabang
    street_address VARCHAR NOT NULL,
    city VARCHAR NOT NULL,
    province VARCHAR NOT NULL,
    postal_code VARCHAR NOT NULL,
    phone VARCHAR,
    
    -- Fasilitas
    treatment_rooms_count INTEGER NOT NULL,
    has_sterilization BOOLEAN NOT NULL DEFAULT false,
    has_radiography BOOLEAN NOT NULL DEFAULT false,
    
    -- Jam Operasional Cabang
    operating_hours JSONB,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(clinic_profile_id, branch_code)
);

CREATE INDEX IF NOT EXISTS idx_clinic_profiles_user_id ON clinic_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_profiles_nib ON clinic_profiles(nib_number);
CREATE INDEX IF NOT EXISTS idx_clinic_profiles_npwp ON clinic_profiles(npwp_number);
CREATE INDEX IF NOT EXISTS idx_clinic_profiles_owner_nik ON clinic_profiles(owner_nik);
CREATE INDEX IF NOT EXISTS idx_clinic_profiles_status ON clinic_profiles(status);
CREATE INDEX IF NOT EXISTS idx_clinic_profiles_legal_name ON clinic_profiles(legal_name);

CREATE INDEX IF NOT EXISTS idx_clinic_branches_clinic_id ON clinic_branches(clinic_profile_id);
CREATE INDEX IF NOT EXISTS idx_clinic_branches_main ON clinic_branches(is_main_branch);
CREATE INDEX IF NOT EXISTS idx_clinic_branches_active ON clinic_branches(is_active);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clinic_profiles_updated_at ON clinic_profiles;
CREATE TRIGGER update_clinic_profiles_updated_at 
    BEFORE UPDATE ON clinic_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clinic_branches_updated_at ON clinic_branches;
CREATE TRIGGER update_clinic_branches_updated_at 
    BEFORE UPDATE ON clinic_branches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add sample operating hours JSON structure as comment
COMMENT ON COLUMN clinic_profiles.operating_hours IS 'JSON structure: {"monday": {"open": "08:00", "close": "17:00", "isOpen": true}, "tuesday": {...}, ...}';
COMMENT ON COLUMN clinic_branches.operating_hours IS 'JSON structure: {"monday": {"open": "08:00", "close": "17:00", "isOpen": true}, "tuesday": {...}, ...} - overrides clinic default if set';
