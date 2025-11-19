-- Add Admin users with proper roles
-- Migration: 010_add_admin_users.sql
-- Default password for all admin accounts: Admin123!
-- IMPORTANT: Change passwords after first login using reset_admin_password scripts

-- First, create super admin user  
INSERT INTO users (name, email, password_hash, roles, created_at, phone_number) 
VALUES (
  'Super Admin', 
  'admin@sereneai.com', 
  '$2b$10$rKZWvNWqL3fV3YX5YhJe7.xHZ8vYqQN5Y9mF2yKZGKxqJ8hF9K3Vy', -- Admin123!
  ARRAY['super_admin', 'admin'], 
  NOW(),
  '+62812-3456-7890'
) ON CONFLICT (email) DO NOTHING;

-- Business Manager
INSERT INTO users (name, email, password_hash, roles, created_at, phone_number) 
VALUES (
  'Business Manager', 
  'business@sereneai.com', 
  '$2b$10$rKZWvNWqL3fV3YX5YhJe7.xHZ8vYqQN5Y9mF2yKZGKxqJ8hF9K3Vy', -- Admin123!
  ARRAY['business_manager', 'admin'], 
  NOW(),
  '+62812-3456-7891'
) ON CONFLICT (email) DO NOTHING;

-- Platform Manager
INSERT INTO users (name, email, password_hash, roles, created_at, phone_number) 
VALUES (
  'Platform Manager', 
  'platform@sereneai.com', 
  '$2b$10$rKZWvNWqL3fV3YX5YhJe7.xHZ8vYqQN5Y9mF2yKZGKxqJ8hF9K3Vy', -- Admin123!
  ARRAY['platform_manager', 'admin'], 
  NOW(),
  '+62812-3456-7892'
) ON CONFLICT (email) DO NOTHING;

-- Finance Manager
INSERT INTO users (name, email, password_hash, roles, created_at, phone_number) 
VALUES (
  'Finance Manager', 
  'finance@sereneai.com', 
  '$2b$10$rKZWvNWqL3fV3YX5YhJe7.xHZ8vYqQN5Y9mF2yKZGKxqJ8hF9K3Vy', -- Admin123!
  ARRAY['finance_manager', 'admin'], 
  NOW(),
  '+62812-3456-7893'
) ON CONFLICT (email) DO NOTHING;

-- Customer Success Manager
INSERT INTO users (name, email, password_hash, roles, created_at, phone_number) 
VALUES (
  'Customer Success Manager', 
  'success@sereneai.com', 
  '$2b$10$rKZWvNWqL3fV3YX5YhJe7.xHZ8vYqQN5Y9mF2yKZGKxqJ8hF9K3Vy', -- Admin123!
  ARRAY['customer_success_manager', 'admin'], 
  NOW(),
  '+62812-3456-7894'
) ON CONFLICT (email) DO NOTHING;

-- Technical Support
INSERT INTO users (name, email, password_hash, roles, created_at, phone_number) 
VALUES (
  'Technical Support', 
  'support@sereneai.com', 
  '$2b$10$rKZWvNWqL3fV3YX5YhJe7.xHZ8vYqQN5Y9mF2yKZGKxqJ8hF9K3Vy', -- Admin123!
  ARRAY['technical_support', 'admin'], 
  NOW(),
  '+62812-3456-7895'
) ON CONFLICT (email) DO NOTHING;

-- AI Engineer
INSERT INTO users (name, email, password_hash, roles, created_at, phone_number) 
VALUES (
  'AI Engineer', 
  'ai@sereneai.com', 
  '$2b$10$rKZWvNWqL3fV3YX5YhJe7.xHZ8vYqQN5Y9mF2yKZGKxqJ8hF9K3Vy', -- Admin123!
  ARRAY['ai_engineer', 'admin'], 
  NOW(),
  '+62812-3456-7896'
) ON CONFLICT (email) DO NOTHING;

-- Compliance Officer
INSERT INTO users (name, email, password_hash, roles, created_at, phone_number) 
VALUES (
  'Compliance Officer', 
  'compliance@sereneai.com', 
  '$2b$10$rKZWvNWqL3fV3YX5YhJe7.xHZ8vYqQN5Y9mF2yKZGKxqJ8hF9K3Vy', -- Admin123!
  ARRAY['compliance_officer', 'admin'], 
  NOW(),
  '+62812-3456-7897'
) ON CONFLICT (email) DO NOTHING;