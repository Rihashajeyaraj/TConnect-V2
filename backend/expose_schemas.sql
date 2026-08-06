-- ============================================================
-- TwiteConnect: Direct Schema Exposure Script for Supabase
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/cljifufjjwrdgethvfvl/sql/new
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Grant permissions on each custom schema
--         (Only applies if the schema actually exists)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
    s TEXT;
    roles TEXT[] := ARRAY['anon', 'authenticated', 'service_role', 'postgres'];
    r TEXT;
BEGIN
    FOR s IN SELECT unnest(ARRAY[
        'hrms', 'crm', 'customer', 'organization',
        'visit', 'notification', 'attendance',
        'expense', 'pipeline', 'reports'
    ])
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = s) THEN
            FOREACH r IN ARRAY roles LOOP
                EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', s, r);
                EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO %I', s, r);
                EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO %I', s, r);
                EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', s, r);
            END LOOP;
            RAISE NOTICE 'Granted permissions on schema: %', s;
        ELSE
            RAISE NOTICE 'Schema does not exist, skipping: %', s;
        END IF;
    END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────
-- STEP 2: Expose all schemas directly via PostgREST (Supabase REST API)
--         This lets you call: client.schema('crm').table('leads')
--         instead of using public views as a workaround.
-- ─────────────────────────────────────────────────────────────
ALTER ROLE authenticator SET pgrst.db_schemas TO
    'public, hrms, crm, customer, organization, visit, notification, attendance, expense, pipeline, reports';


-- ─────────────────────────────────────────────────────────────
-- STEP 3: Reload PostgREST config to apply changes immediately
-- ─────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload config';
