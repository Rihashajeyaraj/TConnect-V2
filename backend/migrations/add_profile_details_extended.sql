-- ============================================================
-- SQL Migration Script: Extended Profile Details
-- Path: backend/migrations/add_profile_details_extended.sql
-- ============================================================

-- 1. Add extended address columns to hrms.employees table
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- 2. Rebuild the public.employees view so it inherits all new columns
DROP VIEW IF EXISTS public.employees;
CREATE OR REPLACE VIEW public.employees AS 
SELECT * FROM hrms.employees;

-- 3. Grant access privileges
GRANT ALL ON hrms.employees TO anon, authenticated, service_role, postgres;
