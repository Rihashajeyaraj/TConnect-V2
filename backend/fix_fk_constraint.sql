-- ============================================================
--  TwiteConnect FK Fix Migration
--  File: fix_fk_constraint.sql
--
--  PROBLEM:
--    public.employees.user_id has a foreign key constraint
--    (employees_user_id_fkey) that references public.users(id).
--    However, public.users does NOT exist in this project.
--    All identity is handled by Supabase Auth (auth.users).
--    auth.users CANNOT be FK-referenced from user-land schemas
--    because Supabase restricts cross-schema FK references to
--    the auth schema. Therefore user_id must be stored as plain
--    TEXT and validated in application code, not via a DB FK.
--
--  FIX:
--    1. Drop the incorrect FK on public.employees.user_id
--    2. Ensure hrms.employees.user_id has no FK (TEXT only)
--    3. Expose hrms schema via PostgREST search path
--    4. Rebuild public.employees view to point to hrms.employees
--
--  RUN IN: Supabase SQL Editor
--  https://supabase.com/dashboard/project/cljifufjjwrdgethvfvl/sql/new
-- ============================================================


-- ---------------------------------------------------------
-- STEP 1: Audit -- show all FK constraints on employees tables
--         (verify employees_user_id_fkey before dropping it)
-- ---------------------------------------------------------
SELECT
    c.conname                    AS constraint_name,
    c.contype                    AS constraint_type,
    a.attname                    AS column_name,
    nf.nspname                   AS referenced_schema,
    cf.relname                   AS referenced_table,
    af.attname                   AS referenced_column
FROM pg_constraint c
JOIN pg_class      t   ON t.oid  = c.conrelid
JOIN pg_namespace  n   ON n.oid  = t.relnamespace
LEFT JOIN pg_attribute  a  ON a.attrelid = t.oid  AND a.attnum = ANY(c.conkey)
LEFT JOIN pg_class      cf ON cf.oid     = c.confrelid
LEFT JOIN pg_namespace  nf ON nf.oid     = cf.relnamespace
LEFT JOIN pg_attribute  af ON af.attrelid = cf.oid AND af.attnum = ANY(c.confkey)
WHERE t.relname = 'employees'
  AND n.nspname IN ('public', 'hrms')
ORDER BY n.nspname, c.conname;


-- ---------------------------------------------------------
-- STEP 2: Drop the incorrect FK on public.employees.user_id
--         that references the non-existent public.users table.
--         IF NOT EXISTS guard prevents error if already removed.
-- ---------------------------------------------------------
DO $$
BEGIN
    -- Drop from public.employees (normalised table)
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE c.conname = 'employees_user_id_fkey'
          AND t.relname = 'employees'
          AND n.nspname = 'public'
    ) THEN
        ALTER TABLE public.employees DROP CONSTRAINT employees_user_id_fkey;
        RAISE NOTICE 'Dropped employees_user_id_fkey from public.employees';
    ELSE
        RAISE NOTICE 'employees_user_id_fkey not found on public.employees -- skipping';
    END IF;

    -- Also drop from hrms.employees if it was somehow added there
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE c.conname = 'employees_user_id_fkey'
          AND t.relname = 'employees'
          AND n.nspname = 'hrms'
    ) THEN
        ALTER TABLE hrms.employees DROP CONSTRAINT employees_user_id_fkey;
        RAISE NOTICE 'Dropped employees_user_id_fkey from hrms.employees';
    END IF;
END $$;


-- ---------------------------------------------------------
-- STEP 3: Drop any OTHER FK on hrms.employees.user_id
--         (catches any FK by any name targeting user_id)
-- ---------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'hrms' AND table_name = 'employees'
    ) THEN
        FOR r IN
            SELECT c.conname
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
            WHERE t.relname = 'employees'
              AND n.nspname = 'hrms'
              AND a.attname = 'user_id'
              AND c.contype = 'f'
        LOOP
            EXECUTE format('ALTER TABLE hrms.employees DROP CONSTRAINT %I', r.conname);
            RAISE NOTICE 'Dropped FK % from hrms.employees.user_id', r.conname;
        END LOOP;
    END IF;
END $$;


-- ---------------------------------------------------------
-- STEP 4: Also drop any FK on public.employees.user_id
--         (catches FKs by any name, not just the known one)
-- ---------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        WHERE t.relname = 'employees'
          AND n.nspname = 'public'
          AND a.attname = 'user_id'
          AND c.contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE public.employees DROP CONSTRAINT %I', r.conname);
        RAISE NOTICE 'Dropped FK % from public.employees.user_id', r.conname;
    END LOOP;
END $$;


-- ---------------------------------------------------------
-- STEP 5: Create hrms schema if it does not yet exist
-- ---------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS hrms;

GRANT USAGE  ON SCHEMA hrms TO anon, authenticated, service_role, postgres;

-- ---------------------------------------------------------
-- STEP 6: Create hrms.employees if it does not yet exist.
--         user_id is plain TEXT -- stores auth.users.id value
--         but without a DB-level FK (auth schema restriction).
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS hrms.employees (
    employee_id     TEXT PRIMARY KEY,
    user_id         TEXT,       -- auth.users.id stored as TEXT; no FK (auth schema restricted)
    auth_user_id    TEXT,       -- backward-compat alias; same value as user_id
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

GRANT ALL ON hrms.employees TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA hrms TO anon, authenticated, service_role, postgres;
ALTER TABLE hrms.employees DISABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------
-- STEP 7: Auto-update trigger for hrms.employees.updated_at
-- ---------------------------------------------------------
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


-- ---------------------------------------------------------
-- STEP 8: Rebuild public.employees view -> hrms.employees
--         Only runs if public.employees is a VIEW (safe).
--         If it is a BASE TABLE, only the FK was dropped (Step 2).
-- ---------------------------------------------------------
DO $$
DECLARE
    ttype TEXT;
BEGIN
    SELECT table_type INTO ttype
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'employees';

    IF ttype = 'VIEW' THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.employees AS SELECT * FROM hrms.employees';
        RAISE NOTICE 'public.employees VIEW recreated pointing to hrms.employees';
    ELSIF ttype = 'BASE TABLE' THEN
        RAISE NOTICE 'public.employees is a BASE TABLE -- view recreation skipped. FK removed in Step 2/4.';
    ELSE
        RAISE NOTICE 'public.employees does not exist (type: %) -- nothing to rebuild', COALESCE(ttype, 'NULL');
    END IF;
END $$;


-- ---------------------------------------------------------
-- STEP 9: Grant hrms schema to PostgREST anon/authenticated
--         ALSO go to Supabase Dashboard -> Settings -> API
--         and add "hrms" to "Extra Search Path".
--         Without that UI step, PGRST106 errors continue.
-- ---------------------------------------------------------
GRANT USAGE ON SCHEMA hrms TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA hrms TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA hrms TO anon, authenticated, service_role;


-- ---------------------------------------------------------
-- STEP 10: Verification -- re-run audit after migration.
--          employees_user_id_fkey should NOT appear below.
-- ---------------------------------------------------------
SELECT
    c.conname                    AS constraint_name,
    c.contype                    AS constraint_type,
    a.attname                    AS column_name,
    nf.nspname                   AS referenced_schema,
    cf.relname                   AS referenced_table,
    af.attname                   AS referenced_column
FROM pg_constraint c
JOIN pg_class      t   ON t.oid  = c.conrelid
JOIN pg_namespace  n   ON n.oid  = t.relnamespace
LEFT JOIN pg_attribute  a  ON a.attrelid = t.oid  AND a.attnum = ANY(c.conkey)
LEFT JOIN pg_class      cf ON cf.oid     = c.confrelid
LEFT JOIN pg_namespace  nf ON nf.oid     = cf.relnamespace
LEFT JOIN pg_attribute  af ON af.attrelid = cf.oid AND af.attnum = ANY(c.confkey)
WHERE t.relname = 'employees'
  AND n.nspname IN ('public', 'hrms')
ORDER BY n.nspname, c.conname;

-- Expected result: no rows with contype = 'f' referencing public.users
