-- ============================================================
--  TwiteConnect HRMS Schema Setup Script
--  Run this once in Supabase SQL Editor:
--  https://supabase.com/dashboard/project/cljifufjjwrdgethvfvl/sql/new
--
--  This creates the hrms.employees table so that every user
--  created by the Admin module is automatically saved here
--  and appears in the HRMS Employee Portal with their Employee ID.
--
--  IDENTITY MODEL:
--    user_id and auth_user_id both store auth.users.id (a UUID).
--    They are kept as plain TEXT columns -- no REFERENCES clause.
--    Reason: Supabase restricts FK references into the auth schema
--    from user-land schemas (public, hrms, etc.). The application
--    layer (HRMSRepository) is responsible for ensuring the value
--    matches a real auth.users.id before inserting.
-- ============================================================

-- 1. Create the hrms schema if it does not exist
CREATE SCHEMA IF NOT EXISTS hrms;

-- 2. Grant access to Supabase roles
GRANT USAGE ON SCHEMA hrms TO anon, authenticated, service_role, postgres;

-- 3. Create hrms.employees table
CREATE TABLE IF NOT EXISTS hrms.employees (
    employee_id     TEXT PRIMARY KEY,
    --
    -- user_id: stores auth.users.id (Supabase Auth UUID).
    -- Plain TEXT -- no FOREIGN KEY constraint.
    -- FK to auth.users is not permitted from user-land schemas.
    -- Application code validates this value before insert.
    user_id         TEXT,
    auth_user_id    TEXT,         -- backward-compat alias; same value as user_id
    employee_code   TEXT UNIQUE NOT NULL,
    first_name      TEXT NOT NULL DEFAULT '',
    last_name       TEXT DEFAULT '',
    name            TEXT,
    email           TEXT UNIQUE NOT NULL,
    phone           TEXT,
    gender          TEXT,
    date_of_birth   TEXT,
    designation     TEXT DEFAULT 'Sales Executive',
    department      TEXT DEFAULT 'Sales & Business Development',
    role            TEXT DEFAULT 'Sales Executive',
    dept            TEXT DEFAULT 'Sales & Business Development',
    status          TEXT DEFAULT 'Active',
    joining_date    DATE,
    company_id      TEXT DEFAULT 'TC-001',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Grant table-level permissions
GRANT ALL ON hrms.employees TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA hrms TO anon, authenticated, service_role, postgres;

-- 5. Disable RLS so service_role can read/write freely
ALTER TABLE hrms.employees DISABLE ROW LEVEL SECURITY;

-- 6. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION hrms.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hrms_employees_updated_at ON hrms.employees;
CREATE TRIGGER hrms_employees_updated_at
  BEFORE UPDATE ON hrms.employees
  FOR EACH ROW EXECUTE FUNCTION hrms.set_updated_at();

-- 7. Create public view so /api/v1/employees falls back to hrms.employees
--    Only runs if public.employees does not already exist as a BASE TABLE.
DO $$
DECLARE
    ttype TEXT;
BEGIN
    SELECT table_type INTO ttype
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'employees';

    IF ttype IS NULL OR ttype = 'VIEW' THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.employees AS SELECT * FROM hrms.employees';
        RAISE NOTICE 'public.employees VIEW created/updated to point at hrms.employees';
    ELSE
        RAISE NOTICE 'public.employees exists as BASE TABLE -- view creation skipped';
    END IF;
END $$;

-- 8. Expose hrms schema via Supabase PostgREST
--    NOTE: You MUST ALSO go to Supabase Dashboard -> Settings -> API
--    and add "hrms" to the "Extra Search Path" / "Exposed Schemas" list.
--    Without that UI step, schema("hrms").table(...) calls return PGRST106.
GRANT USAGE ON SCHEMA hrms TO anon, authenticated, service_role;

-- ============================================================
--  Verification: Run the following SELECT to confirm the table
--  exists and user_id has NO foreign key constraint.
-- ============================================================
-- SELECT
--     c.conname, c.contype, a.attname,
--     nf.nspname AS ref_schema, cf.relname AS ref_table
-- FROM pg_constraint c
-- JOIN pg_class t ON t.oid = c.conrelid
-- JOIN pg_namespace n ON n.oid = t.relnamespace
-- LEFT JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
-- LEFT JOIN pg_class cf ON cf.oid = c.confrelid
-- LEFT JOIN pg_namespace nf ON nf.oid = cf.relnamespace
-- WHERE t.relname = 'employees' AND n.nspname = 'hrms';
--
-- Expected: only PRIMARY KEY and UNIQUE constraints, no 'f' (foreign key) rows.
