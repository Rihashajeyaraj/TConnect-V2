-- Enable extension if it's not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add sick_leaves and other_leaves columns to hrms.employees table
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS sick_leaves INT DEFAULT 10;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS other_leaves INT DEFAULT 10;

-- Drop and Recreate the public.employees view so it inherits all new columns
DROP VIEW IF EXISTS public.employees CASCADE;
CREATE OR REPLACE VIEW public.employees AS 
SELECT * FROM hrms.employees;

-- Create the salaries table (using gen_random_uuid() as fallback if uuid_generate_v4() is not accessible)
CREATE TABLE IF NOT EXISTS hrms.salaries (
    id TEXT PRIMARY KEY DEFAULT ('SAL-' || substr(gen_random_uuid()::text, 1, 8)),
    employee_id TEXT UNIQUE NOT NULL,
    employee_code TEXT NOT NULL,
    monthly_salary NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize salaries for existing employees
INSERT INTO hrms.salaries (employee_id, employee_code, monthly_salary)
SELECT employee_id, employee_code, 35000 
FROM hrms.employees
ON CONFLICT (employee_id) DO NOTHING;

-- Enable Row Level Security (RLS) on hrms.salaries
ALTER TABLE hrms.salaries ENABLE ROW LEVEL SECURITY;

-- Enable policy for Admin/CEO access only
DROP POLICY IF EXISTS "Admin and CEO salaries access policy" ON hrms.salaries;
CREATE POLICY "Admin and CEO salaries access policy" ON hrms.salaries
  FOR ALL
  USING (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'CEO', 'CEO / Founder')
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'CEO', 'CEO / Founder')
  );

-- Grant access privileges
GRANT ALL ON hrms.salaries TO anon, authenticated, service_role, postgres;
