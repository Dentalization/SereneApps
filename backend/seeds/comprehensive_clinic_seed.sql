-- ============================================
-- COMPREHENSIVE CLINIC SEED DATA
-- Description: 10 Clinic Profiles with 10 Branches each
-- Includes: Staff, Dentists, Services, Gallery, Highlights, Facilities, Geolocation
-- Date: 2025-11-22
-- ============================================

-- Start transaction
BEGIN;

-- ============================================
-- STEP 0: Ensure Core Admin Users Exist
-- ============================================

DO $$
DECLARE
  admin_roles TEXT[] := ARRAY[
    'super_admin',
    'business_manager',
    'platform_manager',
    'compliance_officer',
    'customer_success_manager',
    'finance_manager',
    'ai_engineer',
    'technical_support'
  ];
  role TEXT;
  counter INT := 1;
  admin_email TEXT;
BEGIN
  FOREACH role IN ARRAY admin_roles LOOP
    admin_email := role || '@sereneai.com';
    IF NOT EXISTS (SELECT 1 FROM users u WHERE u.email = admin_email) THEN
      INSERT INTO users (name, email, password_hash, roles, phone_number)
      VALUES (
        INITCAP(REPLACE(role, '_', ' ')) || ' Admin',
        admin_email,
        '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi',
        ARRAY[role, 'admin'],
        '+62 811-000' || LPAD(counter::TEXT, 4, '0')
      );
      counter := counter + 1;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- STEP 1: Create Users for Clinic Owners & Staff
-- ============================================

-- Password hash for 'password123' using bcrypt
-- $2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi

-- Clinic 1: Serene Dental Network
INSERT INTO users (name, email, password_hash, roles, phone_number)
VALUES 
  ('dr. Sarah Williams', 'sarah.williams@serenedental.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_owner'], '+62 821-1001-0001'),
  ('Michael Chen', 'manager1.serene@serenedental.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-1001-0002'),
  ('Lisa Anderson', 'admin1.serene@serenedental.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-1001-0003');

-- Clinic 2: Elite Smile Care
INSERT INTO users (name, email, password_hash, roles, phone_number)
VALUES 
  ('dr. David Martinez', 'david.martinez@elitesmile.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_owner'], '+62 821-2001-0001'),
  ('Jessica Wong', 'manager1.elite@elitesmile.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-2001-0002'),
  ('Robert Kim', 'admin1.elite@elitesmile.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-2001-0003');

-- Clinic 3: Premium Dental Studio
INSERT INTO users (name, email, password_hash, roles, phone_number)
VALUES 
  ('dr. Jennifer Lee', 'jennifer.lee@premiumdental.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_owner'], '+62 821-3001-0001'),
  ('Thomas Brown', 'manager1.premium@premiumdental.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-3001-0002'),
  ('Amy Johnson', 'admin1.premium@premiumdental.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-3001-0003');

-- Clinic 4: Bright Smile Clinic
INSERT INTO users (name, email, password_hash, roles, phone_number)
VALUES 
  ('dr. Michael Johnson', 'michael.johnson@brightsmile.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_owner'], '+62 821-4001-0001'),
  ('Sarah Park', 'manager1.bright@brightsmile.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-4001-0002'),
  ('Kevin Lee', 'admin1.bright@brightsmile.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-4001-0003');

-- Clinic 5: FamilyCare Dental
INSERT INTO users (name, email, password_hash, roles, phone_number)
VALUES 
  ('dr. Emily Rodriguez', 'emily.rodriguez@familycare.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_owner'], '+62 821-5001-0001'),
  ('Daniel White', 'manager1.family@familycare.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-5001-0002'),
  ('Laura Martinez', 'admin1.family@familycare.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-5001-0003');

-- Clinic 6: Advanced Dental Care
INSERT INTO users (name, email, password_hash, roles, phone_number)
VALUES 
  ('dr. Robert Thompson', 'robert.thompson@advanceddental.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_owner'], '+62 821-6001-0001'),
  ('Michelle Garcia', 'manager1.advanced@advanceddental.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-6001-0002'),
  ('James Wilson', 'admin1.advanced@advanceddental.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-6001-0003');

-- Clinic 7: Modern Smile Center
INSERT INTO users (name, email, password_hash, roles, phone_number)
VALUES 
  ('dr. Patricia Davis', 'patricia.davis@modernsmile.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_owner'], '+62 821-7001-0001'),
  ('Christopher Lee', 'manager1.modern@modernsmile.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-7001-0002'),
  ('Angela Chen', 'admin1.modern@modernsmile.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-7001-0003');

-- Clinic 8: Comfort Dental Plaza
INSERT INTO users (name, email, password_hash, roles, phone_number)
VALUES 
  ('dr. Christopher Anderson', 'christopher.anderson@comfortdental.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_owner'], '+62 821-8001-0001'),
  ('Elizabeth Moore', 'manager1.comfort@comfortdental.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-8001-0002'),
  ('Matthew Taylor', 'admin1.comfort@comfortdental.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-8001-0003');

-- Clinic 9: Dental Excellence Hub
INSERT INTO users (name, email, password_hash, roles, phone_number)
VALUES 
  ('dr. Amanda White', 'amanda.white@dentalexcel.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_owner'], '+62 821-9001-0001'),
  ('Brian Harris', 'manager1.excel@dentalexcel.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-9001-0002'),
  ('Sophia Martin', 'admin1.excel@dentalexcel.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-9001-0003');

-- Clinic 10: SmileCraft Specialists
INSERT INTO users (name, email, password_hash, roles, phone_number)
VALUES 
  ('dr. Daniel Garcia', 'daniel.garcia@smilecraft.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_owner'], '+62 821-0001-0001'),
  ('Rachel Thompson', 'manager1.smile@smilecraft.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-0001-0002'),
  ('Andrew Jackson', 'admin1.smile@smilecraft.com', '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', ARRAY['clinic_staff'], '+62 821-0001-0003');

-- Create Dentist Users (10 dentists per clinic x 10 clinics = 100 dentists)
DO $$
DECLARE
  clinic_num INT;
  dentist_num INT;
  email_addr VARCHAR;
  full_name VARCHAR;
  first_names TEXT[] := ARRAY['Alex', 'Maria', 'John', 'Emma', 'Ryan', 'Olivia', 'Lucas', 'Sophia', 'Noah', 'Isabella'];
  last_names TEXT[] := ARRAY['Kumar', 'Santos', 'Nguyen', 'Patel', 'Cohen', 'Silva', 'Wang', 'Ali', 'Lopez', 'Kim'];
BEGIN
  FOR clinic_num IN 1..10 LOOP
    FOR dentist_num IN 1..10 LOOP
      email_addr := 'dentist' || dentist_num || '.clinic' || clinic_num || '@dentists.com';
      full_name := 'dr. ' || first_names[dentist_num] || ' ' || last_names[dentist_num];
      
      INSERT INTO users (name, email, password_hash, roles, phone_number)
      VALUES (
        full_name, 
        email_addr, 
        '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi', 
        ARRAY['dentist'], 
        '+62 821-' || LPAD((clinic_num * 100 + dentist_num)::TEXT, 4, '0') || '-' || LPAD(dentist_num::TEXT, 4, '0')
      );
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- STEP 2: Create Clinic Profiles  
-- ============================================

DO $$
DECLARE
  owner_user_id BIGINT;
  clinic_names TEXT[] := ARRAY[
    'Serene Dental Network',
    'Elite Smile Care',
    'Premium Dental Studio',
    'Bright Smile Clinic',
    'FamilyCare Dental',
    'Advanced Dental Care',
    'Modern Smile Center',
    'Comfort Dental Plaza',
    'Dental Excellence Hub',
    'SmileCraft Specialists'
  ];
  clinic_num INT;
  nib_num VARCHAR;
  npwp_num VARCHAR;
  nik_num VARCHAR;
BEGIN
  FOR clinic_num IN 1..10 LOOP
    SELECT id INTO owner_user_id FROM users WHERE roles @> ARRAY['clinic_owner'] ORDER BY id OFFSET (clinic_num - 1) LIMIT 1;
    
    nib_num := '9120' || LPAD((200000 + clinic_num)::TEXT, 9, '0');
    npwp_num := '01.234.' || LPAD(clinic_num::TEXT, 3, '0') || '.5-678.000';
    nik_num := '3175' || LPAD((10000000 + clinic_num)::TEXT, 12, '0');
    
    INSERT INTO clinic_profiles (
      user_id, legal_name, brand_name, facility_type,
      street_address, city, province, postal_code, district,
      latitude, longitude,
      phone, email, timezone, operating_hours,
      owner_name, owner_position, owner_email, owner_whatsapp, owner_nik,
      ktp_file_path, ktp_selfie_file_path, nib_number, nib_file_path,
      npwp_number, npwp_file_path, operational_license_file_path,
      terms_accepted, privacy_accepted, is_verified, status
    )
    VALUES (
      owner_user_id,
      clinic_names[clinic_num] || ' - PT Dental Care Indonesia ' || clinic_num,
      clinic_names[clinic_num],
      CASE WHEN clinic_num % 3 = 0 THEN 'rsgm' ELSE 'klinik_gigi' END,
      'Jl. Jendral Sudirman No. ' || (100 + clinic_num * 10),
      CASE 
        WHEN clinic_num <= 2 THEN 'Jakarta Selatan'
        WHEN clinic_num <= 4 THEN 'Jakarta Pusat'
        WHEN clinic_num <= 6 THEN 'Jakarta Utara'
        WHEN clinic_num <= 8 THEN 'Jakarta Timur'
        ELSE 'Jakarta Barat'
      END,
      'DKI Jakarta',
      '1' || LPAD((2000 + clinic_num * 10)::TEXT, 4, '0'),
      CASE 
        WHEN clinic_num = 1 THEN 'Kebayoran Baru'
        WHEN clinic_num = 2 THEN 'Menteng'
        WHEN clinic_num = 3 THEN 'Setiabudi'
        WHEN clinic_num = 4 THEN 'Kuningan'
        WHEN clinic_num = 5 THEN 'Penjaringan'
        WHEN clinic_num = 6 THEN 'Cilandak'
        WHEN clinic_num = 7 THEN 'Kelapa Gading'
        WHEN clinic_num = 8 THEN 'Pondok Indah'
        WHEN clinic_num = 9 THEN 'Pluit'
        ELSE 'Kebayoran Baru'
      END,
      -6.2088 + (clinic_num * 0.01),
      106.8456 + (clinic_num * 0.01),
      '+62 21 555' || LPAD(clinic_num::TEXT, 4, '0'),
      'contact@' || LOWER(REPLACE(clinic_names[clinic_num], ' ', '')) || '.com',
      'Asia/Jakarta',
      '{"monday": "08:00-20:00", "tuesday": "08:00-20:00", "wednesday": "08:00-20:00", "thursday": "08:00-20:00", "friday": "08:00-20:00", "saturday": "09:00-17:00", "sunday": "Closed"}'::jsonb,
      (SELECT name FROM users WHERE id = owner_user_id),
      'owner',
      (SELECT email FROM users WHERE id = owner_user_id),
      '+62 821-' || LPAD(clinic_num::TEXT, 4, '0') || '-0001',
      nik_num,
      '/uploads/clinics/ktp_' || clinic_num || '.jpg',
      '/uploads/clinics/ktp_selfie_' || clinic_num || '.jpg',
      nib_num,
      '/uploads/clinics/nib_' || clinic_num || '.pdf',
      npwp_num,
      '/uploads/clinics/npwp_' || clinic_num || '.pdf',
      '/uploads/clinics/license_' || clinic_num || '.pdf',
      true,
      true,
      true,
      'verified'
    );
  END LOOP;
END $$;

-- ============================================
-- STEP 3: Create Clinic Branches (10 per clinic)
-- ============================================

DO $$
DECLARE
  clinic_record RECORD;
  branch_num INT;
  areas TEXT[][] := ARRAY[
    ARRAY['Menteng', 'Tanah Abang', 'Gambir', 'Senen', 'Cempaka Putih', 'Johar Baru', 'Kemayoran', 'Sawah Besar', 'Pasar Minggu', 'Tebet'],
    ARRAY['Kebayoran Baru', 'Kebayoran Lama', 'Pesanggrahan', 'Cilandak', 'Pasar Minggu', 'Jagakarsa', 'Mampang Prapatan', 'Pancoran', 'Tebet', 'Setiabudi'],
    ARRAY['Penjaringan', 'Pademangan', 'Tanjung Priok', 'Koja', 'Kelapa Gading', 'Cilincing', 'Pluit', 'Ancol', 'Sunter', 'Pulo Gadung'],
    ARRAY['Cakung', 'Cipayung', 'Ciracas', 'Duren Sawit', 'Jatinegara', 'Kramat Jati', 'Makasar', 'Matraman', 'Pasar Rebo', 'Pulogadung'],
    ARRAY['Cengkareng', 'Grogol Petamburan', 'Taman Sari', 'Tambora', 'Kebon Jeruk', 'Kalideres', 'Palmerah', 'Kembangan', 'Cikini', 'Karet']
  ];
  lat_offsets DECIMAL[] := ARRAY[-0.01, 0.01, -0.015, 0.015, -0.02, 0.02, -0.025, 0.025, -0.03, 0.03];
  lon_offsets DECIMAL[] := ARRAY[0.01, -0.01, 0.015, -0.015, 0.02, -0.02, 0.025, -0.025, 0.03, -0.03];
BEGIN
  FOR clinic_record IN 
    SELECT id, brand_name, latitude, longitude FROM clinic_profiles ORDER BY id
  LOOP
    FOR branch_num IN 1..10 LOOP
      INSERT INTO clinic_branches (
        clinic_profile_id, branch_name, branch_code, is_main_branch,
        street_address, city, province, postal_code, district,
        latitude, longitude,
        phone, treatment_rooms_count, has_sterilization, has_radiography,
        operating_hours, is_active
      )
      VALUES (
        clinic_record.id,
        clinic_record.brand_name || ' - ' || areas[(branch_num % 5) + 1][branch_num],
        'BR' || LPAD(clinic_record.id::TEXT, 3, '0') || '-' || LPAD(branch_num::TEXT, 2, '0'),
        CASE WHEN branch_num = 1 THEN true ELSE false END,
        'Jl. ' || areas[(branch_num % 5) + 1][branch_num] || ' No. ' || (100 + branch_num * 10),
        CASE 
          WHEN (branch_num % 5) = 1 THEN 'Jakarta Pusat'
          WHEN (branch_num % 5) = 2 THEN 'Jakarta Selatan'
          WHEN (branch_num % 5) = 3 THEN 'Jakarta Utara'
          WHEN (branch_num % 5) = 4 THEN 'Jakarta Timur'
          ELSE 'Jakarta Barat'
        END,
        'DKI Jakarta',
        '1' || LPAD((1000 + branch_num * 10)::TEXT, 4, '0'),
        areas[(branch_num % 5) + 1][branch_num],
        clinic_record.latitude + lat_offsets[branch_num],
        clinic_record.longitude + lon_offsets[branch_num],
        '+62 21 ' || LPAD((5000 + clinic_record.id * 100 + branch_num)::TEXT, 8, '0'),
        3 + (branch_num % 5),
        true,
        true,
        '{"monday": "08:00-20:00", "tuesday": "08:00-20:00", "wednesday": "08:00-20:00", "thursday": "08:00-20:00", "friday": "08:00-20:00", "saturday": "09:00-17:00", "sunday": "Closed"}'::jsonb,
        true
      );
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- STEP 4: Create Clinic Staff
-- ============================================

DO $$
DECLARE
  clinic_record RECORD;
  owner_user_id BIGINT;
  manager_user_id BIGINT;
  admin_user_id BIGINT;
  main_branch_id BIGINT;
BEGIN
  FOR clinic_record IN 
    SELECT cp.id as clinic_id, cp.user_id, u.email 
    FROM clinic_profiles cp 
    JOIN users u ON cp.user_id = u.id 
    ORDER BY cp.id
  LOOP
    -- Get main branch
    SELECT id INTO main_branch_id 
    FROM clinic_branches 
    WHERE clinic_profile_id = clinic_record.clinic_id AND is_main_branch = true 
    LIMIT 1;
    
    -- Owner
    INSERT INTO clinic_staff (user_id, clinic_profile_id, assigned_branch_id, role, is_active)
    VALUES (clinic_record.user_id, clinic_record.clinic_id, main_branch_id, 'owner', true);
    
    -- Manager
    SELECT id INTO manager_user_id FROM users 
    WHERE email LIKE '%manager%' AND email LIKE '%' || SPLIT_PART(clinic_record.email, '@', 2) 
    LIMIT 1;
    
    IF manager_user_id IS NOT NULL THEN
      INSERT INTO clinic_staff (user_id, clinic_profile_id, assigned_branch_id, role, is_active)
      VALUES (manager_user_id, clinic_record.clinic_id, main_branch_id, 'manager', true);
    END IF;
    
    -- Admin
    SELECT id INTO admin_user_id FROM users 
    WHERE email LIKE '%admin%' AND email LIKE '%' || SPLIT_PART(clinic_record.email, '@', 2) 
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
      INSERT INTO clinic_staff (user_id, clinic_profile_id, assigned_branch_id, role, is_active)
      VALUES (admin_user_id, clinic_record.clinic_id, main_branch_id, 'admin', true);
    END IF;
  END LOOP;
END $$;

-- ============================================
-- STEP 5: Create Dentist Profiles
-- ============================================

DO $$
DECLARE
  clinic_num INT;
  dentist_num INT;
  dentist_user_id BIGINT;
  clinic_id BIGINT;
  branch_id BIGINT;
  specialties TEXT[] := ARRAY['General Dentistry', 'Orthodontics', 'Periodontics', 'Endodontics', 'Prosthodontics', 'Oral Surgery', 'Pediatric Dentistry', 'Cosmetic Dentistry', 'Implantology', 'Oral Medicine'];
  license_prefixes TEXT[] := ARRAY['LIC', 'STR', 'REG', 'DDS', 'DMD', 'BDS', 'MDS', 'DIP', 'CERT', 'SPEC'];
  avatar_urls TEXT[] := ARRAY[
    'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1502764613149-7f1d229e230f?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80'
  ];
BEGIN
  FOR clinic_num IN 1..10 LOOP
    -- Get clinic_id
    SELECT id INTO clinic_id FROM clinic_profiles ORDER BY id OFFSET (clinic_num - 1) LIMIT 1;
    
    FOR dentist_num IN 1..10 LOOP
      -- Get dentist user
      SELECT id INTO dentist_user_id FROM users 
      WHERE email = 'dentist' || dentist_num || '.clinic' || clinic_num || '@dentists.com';
      
      UPDATE users
      SET avatar_url = avatar_urls[((dentist_num - 1) % array_length(avatar_urls, 1)) + 1]
      WHERE id = dentist_user_id;
      
      -- Get a branch for this dentist (distribute across branches)
      SELECT id INTO branch_id FROM clinic_branches 
      WHERE clinic_profile_id = clinic_id 
      ORDER BY id OFFSET ((dentist_num - 1) % 10) LIMIT 1;
      
      -- Create dentist profile
      INSERT INTO dentist_profiles (
        user_id, clinic_id, dentist_type, is_clinic_owner,
        title, license_number, license_issuing_body, license_expiry_date,
        registration_number, primary_specialization, education_qualification,
        years_of_experience, clinic_name, clinic_address, clinic_working_hours,
        consultation_types, services_offered, consultation_fee,
        accepts_insurance, accepts_bpjs, emergency_availability,
        is_verified, 
        avatar_url,
        latitude, longitude, district, province, postal_code, city
      )
      VALUES (
        dentist_user_id,
        clinic_id,
        'clinic',
        false,
        'dr.',
        license_prefixes[dentist_num] || '-' || LPAD((clinic_num * 10000 + dentist_num)::TEXT, 8, '0'),
        'Indonesian Dental Association',
        CURRENT_DATE + INTERVAL '2 years',
        'REG-' || LPAD((clinic_num * 10000 + dentist_num)::TEXT, 10, '0'),
        specialties[dentist_num],
        'DDS from University of Indonesia' || CASE WHEN dentist_num > 5 THEN ', Specialist in ' || specialties[dentist_num] ELSE '' END,
        5 + (dentist_num % 15),
        (SELECT brand_name FROM clinic_profiles WHERE id = clinic_id),
        (SELECT street_address FROM clinic_branches WHERE id = branch_id),
        '{"monday": "08:00-17:00", "tuesday": "08:00-17:00", "wednesday": "08:00-17:00", "thursday": "08:00-17:00", "friday": "08:00-17:00"}',
        ARRAY['in-person', 'teleconsultation'],
        ARRAY['Consultation', 'Cleaning', 'Filling', 'Root Canal', 'Extraction'],
        150000 + (dentist_num * 50000),
        true,
        true,
        CASE WHEN dentist_num <= 3 THEN true ELSE false END,
        true,
        avatar_urls[((dentist_num - 1) % array_length(avatar_urls, 1)) + 1],
        (SELECT latitude FROM clinic_branches WHERE id = branch_id),
        (SELECT longitude FROM clinic_branches WHERE id = branch_id),
        (SELECT district FROM clinic_branches WHERE id = branch_id),
        (SELECT province FROM clinic_branches WHERE id = branch_id),
        (SELECT postal_code FROM clinic_branches WHERE id = branch_id),
        (SELECT city FROM clinic_branches WHERE id = branch_id)
      );

      INSERT INTO clinic_staff (
        user_id, clinic_profile_id, assigned_branch_id, role, is_active
      ) VALUES (
        dentist_user_id, clinic_id, branch_id, 'dentist', true
      )
      ON CONFLICT (user_id) DO UPDATE
        SET clinic_profile_id = EXCLUDED.clinic_profile_id,
            assigned_branch_id = EXCLUDED.assigned_branch_id,
            role = 'dentist',
            is_active = true;
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- STEP 5B: Create Independent Dentists with Personal Services
-- ============================================

DO $$
DECLARE
  idx INT;
  new_user_id BIGINT;
  profile_id BIGINT;
  full_name TEXT;
  specialization TEXT;
  is_general BOOLEAN;
  independent_first_names TEXT[] := ARRAY['Adrian', 'Nadia', 'Bintang', 'Chandra', 'Dewi', 'Fajar', 'Gracia', 'Hendra', 'Intan', 'Johan'];
  independent_last_names  TEXT[] := ARRAY['Santoso', 'Wijaya', 'Mahendra', 'Lestari', 'Mahani', 'Prasetyo', 'Gunawan', 'Halim', 'Utami', 'Saputra'];
  specialties             TEXT[] := ARRAY['General Dentistry', 'Cosmetic Dentistry', 'Orthodontics', 'Pediatric Dentistry', 'Implantology', 'Endodontics', 'Periodontics', 'Oral Surgery', 'Prosthodontics', 'Digital Dentistry'];
  districts               TEXT[] := ARRAY['Menteng', 'Kemang', 'Pondok Indah', 'Kelapa Gading', 'BSD City', 'Tebet', 'Kebayoran Baru', 'Pluit', 'Bintaro', 'Cilandak'];
  independent_avatars     TEXT[] := ARRAY[
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1521577452071-a99cc9b5e086?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=400&q=80'
  ];
  base_lat DECIMAL := -6.2000;
  base_lon DECIMAL := 106.8200;
BEGIN
  FOR idx IN 1..array_length(independent_first_names, 1) LOOP
    full_name := 'dr. ' || independent_first_names[idx] || ' ' || independent_last_names[idx];
    specialization := specialties[idx];
    is_general := LOWER(specialization) LIKE '%general%';

    INSERT INTO users (name, email, password_hash, roles, phone_number, avatar_url)
    VALUES (
      full_name,
      'independent' || idx || '@dentists.id',
      '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi',
      ARRAY['dentist'],
      '+62 812-' || LPAD((7000 + idx)::TEXT, 4, '0') || '-' || LPAD((2000 + idx)::TEXT, 4, '0'),
      independent_avatars[((idx - 1) % array_length(independent_avatars, 1)) + 1]
    )
    RETURNING id INTO new_user_id;

    INSERT INTO dentist_profiles (
      user_id, clinic_id, dentist_type, is_clinic_owner,
      title, license_number, license_issuing_body, license_expiry_date,
      registration_number, primary_specialization, education_qualification,
      years_of_experience, clinic_name, clinic_address, clinic_working_hours,
      consultation_types, services_offered, consultation_fee,
      accepts_insurance, accepts_bpjs, emergency_availability,
      is_verified,
      avatar_url,
      latitude, longitude, district, province, postal_code, city
    )
    VALUES (
      new_user_id,
      NULL,
      'independent',
      true,
      'drg.',
      'IND-' || LPAD((idx * 12345)::TEXT, 8, '0'),
      'Kementerian Kesehatan RI',
      CURRENT_DATE + INTERVAL '4 years',
      'STR-' || LPAD((idx * 98765)::TEXT, 9, '0'),
      specialization,
      'DDS - Universitas Indonesia' || CASE WHEN NOT is_general THEN ' | Sp. ' || specialization ELSE '' END,
      7 + idx,
      full_name || ' Independent Dental Studio',
      'Jl. ' || districts[idx] || ' No. ' || (40 + idx * 3) || ', Jakarta',
      '{"monday": "09:00-18:00", "tuesday": "09:00-18:00", "wednesday": "09:00-18:00", "thursday": "09:00-18:00", "friday": "09:00-18:00", "saturday": "09:00-14:00", "sunday": "Closed"}',
      ARRAY['in-person', 'teleconsultation', 'home-visit'],
      ARRAY['Comprehensive Checkup', specialization || ' Care', 'Smile Makeover'],
      200000 + (idx * 15000),
      true,
      CASE WHEN idx % 2 = 0 THEN true ELSE false END,
      CASE WHEN idx % 3 = 0 THEN true ELSE false END,
      true,
      independent_avatars[((idx - 1) % array_length(independent_avatars, 1)) + 1],
      base_lat + (idx * 0.012),
      base_lon - (idx * 0.008),
      districts[idx],
      'DKI Jakarta',
      '1' || LPAD((3300 + idx * 11)::TEXT, 4, '0'),
      'Jakarta'
    )
    RETURNING id INTO profile_id;

    INSERT INTO dentist_services (
      dentist_profile_id, name, description, price, category,
      specialty, duration_minutes, managed_by, can_edit, is_active
    )
    VALUES
      (
        profile_id,
        'Comprehensive Dental Checkup',
        'Pemeriksaan menyeluruh, pembersihan ringan, dan rencana perawatan personal.',
        250000 + (idx * 10000),
        'general',
        NULL,
        40,
        'dentist',
        true,
        true
      ),
      (
        profile_id,
        specialization || ' Signature Care',
        'Perawatan fokus pada bidang ' || LOWER(specialization) || ' dengan teknologi terbaru.',
        600000 + (idx * 15000),
        CASE WHEN is_general THEN 'general' ELSE 'specialist' END,
        CASE WHEN is_general THEN NULL ELSE specialization END,
        60,
        'dentist',
        true,
        true
      ),
      (
        profile_id,
        'Home-Care Follow Up',
        'Kontrol lanjutan dan edukasi perawatan mandiri untuk pasien.',
        300000 + (idx * 12000),
        'general',
        NULL,
        35,
        'dentist',
        true,
        true
      );
  END LOOP;
END $$;

-- ============================================
-- STEP 6: Create Clinic Services
-- ============================================

DO $$
DECLARE
  branch_record RECORD;
  service_templates JSONB := '[
    {"name": "Dental Consultation", "description": "Comprehensive oral examination and consultation", "base_price": 150000, "category": "general", "specialty": null, "duration": 30},
    {"name": "Teeth Cleaning (Scaling)", "description": "Professional teeth cleaning and scaling", "base_price": 250000, "category": "general", "specialty": null, "duration": 45},
    {"name": "Teeth Whitening", "description": "Professional teeth whitening treatment", "base_price": 1500000, "category": "general", "specialty": "Cosmetic Dentistry", "duration": 60},
    {"name": "Dental Filling", "description": "Tooth cavity filling with composite resin", "base_price": 300000, "category": "general", "specialty": null, "duration": 45},
    {"name": "Root Canal Treatment", "description": "Endodontic treatment for infected tooth", "base_price": 1200000, "category": "specialist", "specialty": "Endodontics", "duration": 90},
    {"name": "Tooth Extraction", "description": "Simple tooth extraction procedure", "base_price": 350000, "category": "general", "specialty": null, "duration": 30},
    {"name": "Braces Installation", "description": "Orthodontic braces installation", "base_price": 8000000, "category": "specialist", "specialty": "Orthodontics", "duration": 120},
    {"name": "Dental Implant", "description": "Single tooth implant placement", "base_price": 12000000, "category": "specialist", "specialty": "Implantology", "duration": 120},
    {"name": "Dental Crown", "description": "Porcelain crown installation", "base_price": 2500000, "category": "specialist", "specialty": "Prosthodontics", "duration": 90},
    {"name": "Gum Treatment", "description": "Periodontal treatment for gum disease", "base_price": 800000, "category": "specialist", "specialty": "Periodontics", "duration": 60},
    {"name": "Veneer Installation", "description": "Porcelain veneer for smile makeover", "base_price": 3500000, "category": "specialist", "specialty": "Cosmetic Dentistry", "duration": 90},
    {"name": "Wisdom Tooth Extraction", "description": "Surgical extraction of wisdom tooth", "base_price": 1500000, "category": "specialist", "specialty": "Oral Surgery", "duration": 60},
    {"name": "Pediatric Dental Care", "description": "Gentle dental care for children", "base_price": 200000, "category": "specialist", "specialty": "Pediatric Dentistry", "duration": 45},
    {"name": "Dental X-Ray", "description": "Panoramic or periapical X-ray", "base_price": 150000, "category": "general", "specialty": null, "duration": 15},
    {"name": "Retainer", "description": "Orthodontic retainer after braces", "base_price": 1200000, "category": "specialist", "specialty": "Orthodontics", "duration": 45}
  ]'::JSONB;
  service JSONB;
BEGIN
  FOR branch_record IN SELECT id FROM clinic_branches ORDER BY id LOOP
    FOR service IN SELECT * FROM jsonb_array_elements(service_templates) LOOP
      INSERT INTO clinic_services (
        clinic_branch_id, name, description, base_price, category, 
        specialty, duration_minutes, is_active, is_available_for_all_dentists
      )
      VALUES (
        branch_record.id,
        service->>'name',
        service->>'description',
        (service->>'base_price')::DECIMAL,
        service->>'category',
        service->>'specialty',
        (service->>'duration')::INTEGER,
        true,
        CASE WHEN service->>'category' = 'general' THEN true ELSE false END
      );
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- STEP 7: Assign Services to Dentists
-- ============================================

DO $$
DECLARE
  dentist_record RECORD;
  service_record RECORD;
  clinic_branch_id BIGINT;
BEGIN
  FOR dentist_record IN 
    SELECT dp.id as dentist_id, dp.primary_specialization, dp.clinic_id, cb.id as branch_id
    FROM dentist_profiles dp
    JOIN clinic_branches cb ON cb.clinic_profile_id = dp.clinic_id
    WHERE dp.is_verified = true
    LIMIT 100 -- Limit to avoid too many assignments
  LOOP
    -- Assign general services to all dentists
    FOR service_record IN 
      SELECT id, base_price FROM clinic_services cs
      WHERE cs.clinic_branch_id = dentist_record.branch_id
      AND cs.category = 'general'
      LIMIT 6
    LOOP
      INSERT INTO service_dentist_assignments (
        clinic_service_id, dentist_profile_id, custom_price, is_available
      )
      VALUES (
        service_record.id,
        dentist_record.dentist_id,
        NULL, -- Use base price
        true
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
    
    -- Assign specialty services to matching specialists
    FOR service_record IN 
      SELECT id, base_price FROM clinic_services cs
      WHERE cs.clinic_branch_id = dentist_record.branch_id
      AND cs.category = 'specialist'
      AND cs.specialty = dentist_record.primary_specialization
      LIMIT 3
    LOOP
      INSERT INTO service_dentist_assignments (
        clinic_service_id, dentist_profile_id, custom_price, is_available
      )
      VALUES (
        service_record.id,
        dentist_record.dentist_id,
        service_record.base_price * 1.2, -- Specialist adds 20% premium
        true
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- STEP 8: Create Clinic Gallery
-- ============================================

DO $$
DECLARE
  branch_record RECORD;
  image_num INT;
  image_types TEXT[] := ARRAY['hero', 'cover', 'facility', 'facility', 'general', 'general', 'general', 'general'];
  image_captions TEXT[] := ARRAY[
    'Welcome to our modern dental clinic',
    'State-of-the-art treatment rooms',
    'Comfortable waiting area',
    'Advanced dental equipment',
    'Our experienced dental team',
    'Patient care in action',
    'Sterilization room',
    'Reception area'
  ];
BEGIN
  FOR branch_record IN SELECT id FROM clinic_branches ORDER BY id LOOP
    FOR image_num IN 1..8 LOOP
      INSERT INTO clinic_gallery (
        clinic_branch_id, image_url, image_type, caption, display_order, is_active
      )
      VALUES (
        branch_record.id,
        'https://images.unsplash.com/photo-' || (1600000000 + branch_record.id * 10 + image_num) || '?w=800',
        image_types[image_num],
        image_captions[image_num],
        image_num,
        true
      );
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- STEP 9: Create Clinic Highlights
-- ============================================

DO $$
DECLARE
  branch_record RECORD;
  highlights TEXT[][] := ARRAY[
    ARRAY['3D Digital Scanning', 'tooth-3d'],
    ARRAY['Painless Laser Treatment', 'laser'],
    ARRAY['Emergency Dental Care', 'emergency'],
    ARRAY['Child-Friendly Environment', 'child'],
    ARRAY['Insurance Accepted', 'insurance'],
    ARRAY['Flexible Payment Plans', 'payment'],
    ARRAY['Experienced Specialists', 'doctor'],
    ARRAY['Modern Equipment', 'technology']
  ];
  highlight_num INT;
BEGIN
  FOR branch_record IN SELECT id FROM clinic_branches ORDER BY id LOOP
    FOR highlight_num IN 1..8 LOOP
      INSERT INTO clinic_highlights (
        clinic_branch_id, highlight_text, icon, display_order, is_active
      )
      VALUES (
        branch_record.id,
        highlights[highlight_num][1],
        highlights[highlight_num][2],
        highlight_num,
        true
      );
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- STEP 10: Create Clinic Facilities
-- ============================================

DO $$
DECLARE
  branch_record RECORD;
  facilities JSONB := '[
    {"name": "Smart Treatment Rooms", "description": "Fully equipped treatment rooms with digital displays and entertainment systems", "icon": "room"},
    {"name": "Sterilization Center", "description": "Hospital-grade sterilization equipment ensuring highest hygiene standards", "icon": "sterilize"},
    {"name": "VIP Lounge", "description": "Comfortable waiting area with complimentary refreshments and WiFi", "icon": "lounge"},
    {"name": "Digital X-Ray", "description": "Low-radiation digital X-ray technology for accurate diagnosis", "icon": "xray"},
    {"name": "Intraoral Camera", "description": "See what the dentist sees on screen during examination", "icon": "camera"},
    {"name": "Free Parking", "description": "Ample parking space for patients and visitors", "icon": "parking"},
    {"name": "Wheelchair Access", "description": "Fully accessible facilities for patients with mobility needs", "icon": "accessible"},
    {"name": "Kids Play Area", "description": "Dedicated play area to keep children entertained", "icon": "playground"}
  ]'::JSONB;
  facility JSONB;
  facility_num INT;
BEGIN
  FOR branch_record IN SELECT id FROM clinic_branches ORDER BY id LOOP
    facility_num := 1;
    FOR facility IN SELECT * FROM jsonb_array_elements(facilities) LOOP
      INSERT INTO clinic_facilities (
        clinic_branch_id, facility_name, description, icon, display_order, is_active
      )
      VALUES (
        branch_record.id,
        facility->>'name',
        facility->>'description',
        facility->>'icon',
        facility_num,
        true
      );
      facility_num := facility_num + 1;
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- Update clinic_id in users table
-- ============================================

UPDATE users u
SET clinic_id = cp.id
FROM clinic_profiles cp
WHERE u.id = cp.user_id;

UPDATE users u
SET clinic_id = cs.clinic_profile_id
FROM clinic_staff cs
WHERE u.id = cs.user_id;

-- ============================================
-- Verification Summary
-- ============================================

DO $$
DECLARE
  clinic_count INT;
  branch_count INT;
  staff_count INT;
  dentist_count INT;
  service_count INT;
  assignment_count INT;
  gallery_count INT;
  highlight_count INT;
  facility_count INT;
BEGIN
  SELECT COUNT(*) INTO clinic_count FROM clinic_profiles;
  SELECT COUNT(*) INTO branch_count FROM clinic_branches;
  SELECT COUNT(*) INTO staff_count FROM clinic_staff;
  SELECT COUNT(*) INTO dentist_count FROM dentist_profiles;
  SELECT COUNT(*) INTO service_count FROM clinic_services;
  SELECT COUNT(*) INTO assignment_count FROM service_dentist_assignments;
  SELECT COUNT(*) INTO gallery_count FROM clinic_gallery;
  SELECT COUNT(*) INTO highlight_count FROM clinic_highlights;
  SELECT COUNT(*) INTO facility_count FROM clinic_facilities;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SEED DATA CREATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Clinic Profiles: %', clinic_count;
  RAISE NOTICE 'Clinic Branches: %', branch_count;
  RAISE NOTICE 'Clinic Staff: %', staff_count;
  RAISE NOTICE 'Dentist Profiles: %', dentist_count;
  RAISE NOTICE 'Clinic Services: %', service_count;
  RAISE NOTICE 'Service Assignments: %', assignment_count;
  RAISE NOTICE 'Gallery Images: %', gallery_count;
  RAISE NOTICE 'Highlights: %', highlight_count;
  RAISE NOTICE 'Facilities: %', facility_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Default password for all users: password123';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
