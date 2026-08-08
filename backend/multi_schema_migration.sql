-- ============================================================
--  TWITE CONNECT - MULTI-SCHEMA SUPABASE MIGRATION SCRIPT
--  Run this script in the Supabase SQL Editor:
--  https://supabase.com/dashboard/project/_/sql/new
--
--  SCHEMAS CREATED:
--  1. hrms             -> employees, attendance, leave_requests, enrollments
--  2. organization     -> organization_settings
--  3. crm              -> leads, customers, opportunities
--  4. field_management -> visits
--  5. finance          -> expenses
--  6. system           -> notifications, reports_eod, todos, audit_logs
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CREATE ALL 6 TARGET APPLICATION SCHEMAS
-- ============================================================
CREATE SCHEMA IF NOT EXISTS hrms;
CREATE SCHEMA IF NOT EXISTS organization;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS field_management;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS system;

-- Grant USAGE to all Supabase database roles
GRANT USAGE ON SCHEMA hrms, organization, crm, field_management, finance, system 
TO anon, authenticated, service_role, postgres;


-- ============================================================
-- 2. SAFE TABLE MIGRATION HELPER FUNCTION
-- Moves existing tables from public to target schema without data loss
-- ============================================================
DO $$
DECLARE
    move_table RECORD;
BEGIN
    -- Define the mapping of table_name -> target_schema
    FOR move_table IN 
        SELECT * FROM (VALUES
            ('employees', 'hrms'),
            ('attendance', 'hrms'),
            ('attendance_logs', 'hrms'),
            ('leave_requests', 'hrms'),
            ('leaves', 'hrms'),
            ('enrollments', 'hrms'),
            ('organization_settings', 'organization'),
            ('company_profile', 'organization'),
            ('leads', 'crm'),
            ('customers', 'crm'),
            ('opportunities', 'crm'),
            ('visits', 'field_management'),
            ('expenses', 'finance'),
            ('claims', 'finance'),
            ('notifications', 'system'),
            ('reports_eod', 'system'),
            ('todos', 'system'),
            ('audit_logs', 'system')
        ) AS t(tbl_name, target_schema)
    LOOP
        -- Check if table exists in public schema
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = move_table.tbl_name
            AND table_type = 'BASE TABLE'
        ) THEN
            -- Check if it already exists in target schema
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = move_table.target_schema 
                AND table_name = move_table.tbl_name
            ) THEN
                EXECUTE format('ALTER TABLE public.%I SET SCHEMA %I', move_table.tbl_name, move_table.target_schema);
                RAISE NOTICE 'Moved table public.% to schema %', move_table.tbl_name, move_table.target_schema;
            ELSE
                RAISE NOTICE 'Table % already exists in % schema; skipping public move', move_table.tbl_name, move_table.target_schema;
            END IF;
        END IF;
    END LOOP;
END $$;


-- ============================================================
-- 3. CREATE TABLES IN TARGET SCHEMAS (If they do not yet exist)
-- ============================================================

-- ── SCHEMA: hrms ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hrms.employees (
    id TEXT PRIMARY KEY DEFAULT ('EMP-' || substr(uuid_generate_v4()::text, 1, 8)),
    employee_id TEXT,
    employee_code TEXT UNIQUE,
    user_id TEXT,
    auth_user_id TEXT,
    name TEXT NOT NULL,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'Sales Executive',
    designation TEXT DEFAULT 'Sales Executive',
    department TEXT DEFAULT 'Sales & Business Development',
    dept TEXT DEFAULT 'Sales & Business Development',
    reporting_manager_id TEXT,
    reporting_manager_name TEXT,
    status TEXT DEFAULT 'Active',
    joining_date DATE DEFAULT CURRENT_DATE,
    company_id TEXT DEFAULT 'TC-001',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hrms.attendance (
    id TEXT PRIMARY KEY DEFAULT ('ATT-' || substr(uuid_generate_v4()::text, 1, 8)),
    employee_id TEXT NOT NULL,
    employee_name TEXT,
    email TEXT,
    attendance_date DATE DEFAULT CURRENT_DATE,
    date DATE DEFAULT CURRENT_DATE,
    check_in_time TEXT,
    punch_in_time TEXT,
    check_out_time TEXT,
    punch_out_time TEXT,
    check_in_latitude NUMERIC,
    check_in_longitude NUMERIC,
    latitude NUMERIC,
    longitude NUMERIC,
    check_out_latitude NUMERIC,
    check_out_longitude NUMERIC,
    check_in_address TEXT,
    work_location TEXT,
    check_out_address TEXT,
    total_working_hours TEXT DEFAULT '0.0 hrs',
    attendance_status TEXT DEFAULT 'Present',
    status TEXT DEFAULT 'Present',
    mode TEXT DEFAULT 'Biometric',
    enrollment_status TEXT DEFAULT 'ENROLLED',
    verification_status TEXT DEFAULT 'VERIFIED',
    device_info TEXT,
    ip_address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hrms.leave_requests (
    id TEXT PRIMARY KEY DEFAULT ('LV-' || substr(uuid_generate_v4()::text, 1, 8)),
    leave_id TEXT,
    employee_id TEXT,
    employee_code TEXT,
    employee_name TEXT NOT NULL,
    executive_name TEXT,
    executive_email TEXT,
    email TEXT,
    role TEXT DEFAULT 'Sales Executive',
    leave_type TEXT NOT NULL,
    from_date DATE,
    to_date DATE,
    time_slot TEXT DEFAULT 'Full Day',
    duration TEXT DEFAULT '1 Day',
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    reviewed_by TEXT,
    manager_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hrms.enrollments (
    id TEXT PRIMARY KEY DEFAULT ('ENR-' || substr(uuid_generate_v4()::text, 1, 8)),
    employee_id TEXT UNIQUE NOT NULL,
    employee_name TEXT,
    enrollment_status TEXT DEFAULT 'ENROLLED',
    enrolled BOOLEAN DEFAULT TRUE,
    face_data_url TEXT,
    biometric_hash TEXT,
    device_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── SCHEMA: organization ───────────────────────────────────

CREATE TABLE IF NOT EXISTS organization.organization_settings (
    id TEXT PRIMARY KEY DEFAULT 'TC-001',
    company_name TEXT DEFAULT 'TwiteConnect Technologies Pvt. Ltd.',
    company_code TEXT DEFAULT 'TC-001',
    legal_name TEXT DEFAULT 'TwiteConnect Software Solutions & Services Pvt Ltd',
    registration_no TEXT DEFAULT 'U72200TN2026PTC123456',
    tax_id_gstin TEXT DEFAULT '33AAAAA0000A1Z5',
    pan_no TEXT DEFAULT 'AAAAA1111A',
    email TEXT DEFAULT 'ceo.office@tconnect.com',
    phone TEXT DEFAULT '+91 98765 43210',
    website TEXT DEFAULT 'https://twiteconnect.com',
    address TEXT DEFAULT 'Plot 45, OMR IT Expressway, Perungudi, Chennai - 600096, Tamil Nadu',
    logo_url TEXT,
    currency TEXT DEFAULT 'INR (₹)',
    time_zone TEXT DEFAULT 'Asia/Kolkata (IST)',
    annual_sales_target NUMERIC DEFAULT 35000000,
    branches JSONB DEFAULT '[]'::jsonb,
    departments JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── SCHEMA: crm ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm.leads (
    id TEXT PRIMARY KEY DEFAULT ('LD-' || substr(uuid_generate_v4()::text, 1, 8)),
    lead_id TEXT,
    name TEXT NOT NULL,
    company TEXT,
    company_name TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    source TEXT DEFAULT 'Website',
    status TEXT DEFAULT 'NEW',
    category TEXT DEFAULT 'Warm',
    assigned_to TEXT,
    assigned_to_email TEXT,
    sales_manager TEXT,
    product_name TEXT DEFAULT 'TwiteConnect CRM',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.customers (
    id TEXT PRIMARY KEY DEFAULT ('CUST-' || substr(uuid_generate_v4()::text, 1, 8)),
    customer_id TEXT,
    lead_id TEXT,
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    company_name TEXT,
    contact_person TEXT,
    person TEXT,
    email TEXT,
    phone TEXT,
    location TEXT DEFAULT 'Chennai, TN',
    address TEXT,
    city TEXT,
    sales_manager TEXT DEFAULT 'Vikram Singh',
    sales_executive TEXT DEFAULT 'Ananya Roy',
    contract_value NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Active Customer',
    notes TEXT,
    onboarding_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.opportunities (
    id TEXT PRIMARY KEY DEFAULT ('OPP-' || substr(uuid_generate_v4()::text, 1, 8)),
    opportunity_id TEXT,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    lead_id TEXT,
    customer_id TEXT,
    value NUMERIC DEFAULT 0,
    stage TEXT DEFAULT 'Lead',
    probability INT DEFAULT 30,
    rep TEXT,
    assigned_to TEXT,
    sales_manager TEXT,
    expected_close_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── SCHEMA: field_management ───────────────────────────────

CREATE TABLE IF NOT EXISTS field_management.visits (
    id TEXT PRIMARY KEY DEFAULT ('VST-' || substr(uuid_generate_v4()::text, 1, 8)),
    visit_id TEXT,
    client_name TEXT NOT NULL,
    company_name TEXT,
    lead_id TEXT,
    employee_id TEXT,
    employee_name TEXT,
    assigned_to_email TEXT,
    purpose TEXT DEFAULT 'Product Demo & Requirement Analysis',
    status TEXT DEFAULT 'SCHEDULED',
    location TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    check_in_latitude NUMERIC,
    check_in_longitude NUMERIC,
    check_in_address TEXT,
    outcome TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── SCHEMA: finance ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finance.expenses (
    id TEXT PRIMARY KEY DEFAULT ('EXP-' || substr(uuid_generate_v4()::text, 1, 8)),
    expense_id TEXT,
    user_id TEXT,
    employee_id TEXT,
    employee_name TEXT,
    email TEXT,
    reporting_manager TEXT,
    reporting_manager_email TEXT,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Travel & Fuel',
    amount NUMERIC NOT NULL DEFAULT 0,
    receipt_url TEXT,
    status TEXT DEFAULT 'Pending',
    reviewed_by TEXT,
    remarks TEXT,
    expense_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── SCHEMA: system ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system.notifications (
    id TEXT PRIMARY KEY DEFAULT ('NOTIF-' || substr(uuid_generate_v4()::text, 1, 8)),
    recipient_user_id TEXT,
    recipient_role TEXT DEFAULT 'ALL',
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    link TEXT,
    unread BOOLEAN DEFAULT TRUE,
    is_read BOOLEAN DEFAULT FALSE,
    read BOOLEAN DEFAULT FALSE,
    actionable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.reports_eod (
    id TEXT PRIMARY KEY DEFAULT ('EOD-' || substr(uuid_generate_v4()::text, 1, 8)),
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    manager_name TEXT,
    report_date DATE DEFAULT CURRENT_DATE,
    visits_count INT DEFAULT 0,
    leads_contacted INT DEFAULT 0,
    deals_won INT DEFAULT 0,
    collections_amount NUMERIC DEFAULT 0,
    challenges_faced TEXT,
    next_day_plan TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.todos (
    id TEXT PRIMARY KEY DEFAULT ('TODO-' || substr(uuid_generate_v4()::text, 1, 8)),
    user_id TEXT,
    employee_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    priority TEXT DEFAULT 'Medium',
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('AUD-' || substr(uuid_generate_v4()::text, 1, 8)),
    user_id TEXT,
    user_email TEXT,
    role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 4. GRANT TABLE AND SEQUENCE PERMISSIONS
-- ============================================================
DO $$
DECLARE
    sch TEXT;
BEGIN
    FOR sch IN SELECT unnest(ARRAY['hrms', 'organization', 'crm', 'field_management', 'finance', 'system'])
    LOOP
        EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO anon, authenticated, service_role, postgres;', sch);
        EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO anon, authenticated, service_role, postgres;', sch);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO anon, authenticated, service_role, postgres;', sch);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON SEQUENCES TO anon, authenticated, service_role, postgres;', sch);
    END LOOP;
END $$;


-- ============================================================
-- 5. DISABLE ROW LEVEL SECURITY (RLS) FOR SERVICE ROLE API ACCESS
-- ============================================================
ALTER TABLE hrms.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.enrollments DISABLE ROW LEVEL SECURITY;

ALTER TABLE organization.organization_settings DISABLE ROW LEVEL SECURITY;

ALTER TABLE crm.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm.opportunities DISABLE ROW LEVEL SECURITY;

ALTER TABLE field_management.visits DISABLE ROW LEVEL SECURITY;

ALTER TABLE finance.expenses DISABLE ROW LEVEL SECURITY;

ALTER TABLE system.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE system.reports_eod DISABLE ROW LEVEL SECURITY;
ALTER TABLE system.todos DISABLE ROW LEVEL SECURITY;
ALTER TABLE system.audit_logs DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 6. ALIGN COLUMNS & DEFAULT INITIAL SEED DATA
-- ============================================================
-- Ensure compatibility columns exist on hrms.employees if already created previously
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS employee_code TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS status TEXT;

-- Populate employee_id / id if null safely
DO $$
BEGIN
    -- If employee_id is UUID, use uuid_generate_v4()
    BEGIN
        UPDATE hrms.employees SET employee_id = uuid_generate_v4() WHERE employee_id IS NULL;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

-- Ensure first_name and last_name columns are flexible
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '';
ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';
ALTER TABLE hrms.employees ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE hrms.employees ALTER COLUMN first_name SET DEFAULT '';
ALTER TABLE hrms.employees ALTER COLUMN last_name SET DEFAULT '';

INSERT INTO organization.organization_settings (id, company_name, tax_id_gstin, email, annual_sales_target)
VALUES (
    'TC-001',
    'TwiteConnect Technologies Pvt. Ltd.',
    '33AAAAA0000A1Z5',
    'ceo@tconnect.com',
    35000000
) ON CONFLICT (id) DO NOTHING;

INSERT INTO hrms.employees (employee_code, first_name, last_name, name, email, role, designation, department, status)
VALUES 
    ('EMP000001', 'Dr. Twite', 'Executive', 'Dr. Twite Executive', 'ceo@tconnect.com', 'CEO / Founder', 'Chief Executive Officer', 'Executive Office', 'Active'),
    ('EMP000002', 'Priya', 'Sharma', 'Priya Sharma', 'admin@tconnect.com', 'Super Admin', 'System Administrator', 'Operations', 'Active'),
    ('EMP000003', 'Vikram', 'Singh', 'Vikram Singh', 'manager@tconnect.com', 'Sales Manager', 'Regional Sales Manager', 'Sales & BD', 'Active'),
    ('EMP000004', 'Ananya', 'Roy', 'Ananya Roy', 'executive@tconnect.com', 'Sales Executive', 'Senior Field Representative', 'Sales & BD', 'Active')
ON CONFLICT (email) DO NOTHING;


-- ============================================================
-- 7. VERIFICATION QUERIES
-- ============================================================
-- Confirm all 14 tables exist in their assigned schemas:
SELECT 
    table_schema, 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema IN ('hrms', 'organization', 'crm', 'field_management', 'finance', 'system')
ORDER BY table_schema, table_name;
