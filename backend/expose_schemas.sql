-- TwiteConnect Safe Schema Exposure Script for Supabase SQL Editor
-- Paste and run this script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/cljifufjjwrdgethvfvl/sql/new

-- 1. Safe Permissions Grant for Existing Custom Schemas
DO $$
DECLARE
    s TEXT;
BEGIN
    FOR s IN SELECT unnest(ARRAY['hrms', 'crm', 'customer', 'organization', 'visit', 'notification', 'attendance', 'expense', 'pipeline'])
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = s) THEN
            EXECUTE format('GRANT USAGE ON SCHEMA %I TO anon, authenticated, service_role, postgres', s);
            EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO anon, authenticated, service_role, postgres', s);
            EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO anon, authenticated, service_role, postgres', s);
        END IF;
    END LOOP;
END $$;

-- 2. Create Public Fallback Views for Direct API Access
CREATE OR REPLACE VIEW public.employees AS SELECT * FROM hrms.employees;
CREATE OR REPLACE VIEW public.company_profile AS SELECT * FROM organization.company_profile;
CREATE OR REPLACE VIEW public.leads AS SELECT * FROM crm.leads;
CREATE OR REPLACE VIEW public.customers AS SELECT * FROM customer.customers;
