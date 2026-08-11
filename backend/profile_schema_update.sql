-- ============================================================
-- SQL Migration Script: Profile Schema Update and HRMS Fixes
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/cljifufjjwrdgethvfvl/sql/new
-- ============================================================

-- 1. Add missing profile columns to hrms.employees table
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS employment_type TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS work_mode TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS work_location TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS pan_id TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS personal_email TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS alternate_contact TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS current_address TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS permanent_address TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS primary_skills TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS secondary_skills TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS tools TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS emergency_name TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS emergency_relationship TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS account_holder TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS ifsc TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS profile_photo TEXT;

-- 2. Drop and Recreate the public.employees view so it inherits all new columns
DROP VIEW IF EXISTS public.employees;
CREATE OR REPLACE VIEW public.employees AS 
SELECT * FROM hrms.employees;

-- 3. Add face_template_vector to hrms.enrollments to store biometric face hashes
ALTER TABLE hrms.enrollments ADD COLUMN IF NOT EXISTS face_template_vector JSONB;

-- 4. Grant access privileges
GRANT ALL ON hrms.employees TO anon, authenticated, service_role, postgres;
GRANT ALL ON hrms.enrollments TO anon, authenticated, service_role, postgres;
