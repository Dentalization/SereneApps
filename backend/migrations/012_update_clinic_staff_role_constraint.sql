-- Migration: expand clinic_staff role check constraint to include dentist and admin roles

ALTER TABLE clinic_staff
  DROP CONSTRAINT IF EXISTS clinic_staff_role_check;

ALTER TABLE clinic_staff
  ADD CONSTRAINT clinic_staff_role_check
  CHECK (role IN (
    'owner',
    'manager',
    'front_office',
    'nurse',
    'cashier',
    'admin',
    'dentist',
    'staff'
  ));
