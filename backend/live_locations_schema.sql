-- ============================================================
-- TwiteConnect Live Locations Table Migration (Corrected)
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/cljifufjjwrdgethvfvl/sql/new
-- ============================================================

-- 1. Create hrms.employee_locations table
CREATE TABLE IF NOT EXISTS hrms.employee_locations (
    employee_id     TEXT PRIMARY KEY REFERENCES hrms.employees(employee_id) ON DELETE CASCADE,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    accuracy        DOUBLE PRECISION,
    is_online       BOOLEAN DEFAULT TRUE,
    last_seen_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Grant access to Supabase roles
GRANT ALL ON hrms.employee_locations TO anon, authenticated, service_role, postgres;

-- 3. Enable RLS on the table
ALTER TABLE hrms.employee_locations ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow executives to update their own location" ON hrms.employee_locations;
DROP POLICY IF EXISTS "Allow managers to read their assigned team locations" ON hrms.employee_locations;

-- 5. Create RLS Policy: Allow Sales Executives to insert/update their own live coordinates
-- Resolves the logged-in user's UUID (auth.jwt() ->> 'sub') to their hrms.employees.employee_id
CREATE POLICY "Allow executives to update their own location" 
ON hrms.employee_locations 
FOR ALL 
TO authenticated 
USING (
    employee_id IN (
        SELECT e.employee_id FROM hrms.employees e 
        WHERE e.user_id = auth.jwt() ->> 'sub' OR e.auth_user_id = auth.jwt() ->> 'sub' OR e.employee_id = auth.jwt() ->> 'sub'
    )
) 
WITH CHECK (
    employee_id IN (
        SELECT e.employee_id FROM hrms.employees e 
        WHERE e.user_id = auth.jwt() ->> 'sub' OR e.auth_user_id = auth.jwt() ->> 'sub' OR e.employee_id = auth.jwt() ->> 'sub'
    )
);

-- 6. Create RLS Policy: Allow Sales Managers to SELECT locations of their assigned team members
-- Determines if the executive has a reporting manager relationship matching the authenticated manager's UUID
CREATE POLICY "Allow managers to read their assigned team locations" 
ON hrms.employee_locations 
FOR SELECT 
TO authenticated 
USING (
    employee_id IN (
        SELECT e.employee_id FROM hrms.employees e 
        WHERE e.user_id = auth.jwt() ->> 'sub' OR e.auth_user_id = auth.jwt() ->> 'sub' OR e.employee_id = auth.jwt() ->> 'sub'
    )
    OR EXISTS (
        SELECT 1 FROM hrms.employees subordinate 
        JOIN hrms.employees manager ON (
            subordinate.reporting_manager = manager.employee_id 
            OR subordinate.reporting_manager_id = manager.employee_id 
            OR subordinate.reporting_manager_email = manager.email
        )
        WHERE subordinate.employee_id = hrms.employee_locations.employee_id 
          AND (
              manager.user_id = auth.jwt() ->> 'sub' 
              OR manager.auth_user_id = auth.jwt() ->> 'sub' 
              OR manager.employee_id = auth.jwt() ->> 'sub'
          )
    )
    OR auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'CEO')
);

-- 7. Create Index on updated_at for performance
CREATE INDEX IF NOT EXISTS idx_employee_locations_updated_at ON hrms.employee_locations(updated_at);

-- 8. Auto-update updated_at trigger
DROP TRIGGER IF EXISTS hrms_employee_locations_updated_at ON hrms.employee_locations;
CREATE TRIGGER hrms_employee_locations_updated_at
  BEFORE UPDATE ON hrms.employee_locations
  FOR EACH ROW EXECUTE FUNCTION hrms.set_updated_at();

-- 9. Notify PostgREST to reload schema config cache
NOTIFY pgrst, 'reload config';
