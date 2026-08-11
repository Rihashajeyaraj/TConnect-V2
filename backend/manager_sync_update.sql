-- 1. Add reporting manager tracking columns to hrms.employees table
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS reporting_manager_id TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS reporting_manager_name TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS reporting_manager_email TEXT;

-- 2. Drop and Recreate the public.employees view so it inherits all new columns
DROP VIEW IF EXISTS public.employees;
CREATE OR REPLACE VIEW public.employees AS 
SELECT * FROM hrms.employees;

-- 3. Grant access privileges
GRANT ALL ON hrms.employees TO anon, authenticated, service_role, postgres;
GRANT ALL ON public.employees TO anon, authenticated, service_role, postgres;
