-- Migration: Add proper clinic-staff relationships
-- Created: 2025-01-19
-- Description: Add ClinicStaff junction table to properly link staff to clinics

CREATE TABLE IF NOT EXISTS clinic_staff (
    id BIGSERIAL PRIMARY KEY,
    clinic_profile_id BIGINT NOT NULL REFERENCES clinic_profiles(id) ON DELETE CASCADE,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- UNIQUE: satu user = satu clinic
    
    -- Staff role at this clinic
    role VARCHAR NOT NULL CHECK (role IN ('owner', 'manager', 'front_office', 'nurse', 'cashier', 'staff')),
    
    -- Employment details
    is_active BOOLEAN NOT NULL DEFAULT true,
    hire_date DATE,
    position_title VARCHAR,
    department VARCHAR,
    
    -- Branch assignment (optional - staff can work at all branches or specific ones)
    assigned_branch_id BIGINT REFERENCES clinic_branches(id) ON DELETE SET NULL,
    
    -- Permissions specific untuk clinic ini
    permissions JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_staff_clinic_id ON clinic_staff(clinic_profile_id);
CREATE INDEX IF NOT EXISTS idx_clinic_staff_user_id ON clinic_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_staff_role ON clinic_staff(role);
CREATE INDEX IF NOT EXISTS idx_clinic_staff_active ON clinic_staff(is_active);
CREATE INDEX IF NOT EXISTS idx_clinic_staff_branch ON clinic_staff(assigned_branch_id);

DROP TRIGGER IF EXISTS update_clinic_staff_updated_at ON clinic_staff;
CREATE TRIGGER update_clinic_staff_updated_at 
    BEFORE UPDATE ON clinic_staff 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add sample permissions JSON structure as comment
COMMENT ON COLUMN clinic_staff.permissions IS 'JSON structure: {"modules": ["dashboard", "schedule", "patients"], "canViewReports": true, "canEditSettings": false}';

-- Add comments for clarity
COMMENT ON TABLE clinic_staff IS 'Staff assignment table - Each user can only work at ONE clinic';
COMMENT ON COLUMN clinic_staff.user_id IS 'UNIQUE constraint ensures one staff = one clinic only';
COMMENT ON COLUMN clinic_staff.role IS 'Role of the staff member at this specific clinic';
COMMENT ON COLUMN clinic_staff.assigned_branch_id IS 'Optional: Specific branch assignment. NULL means can work at all branches';
