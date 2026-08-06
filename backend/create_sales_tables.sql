-- ============================================================
--  TwiteConnect Full Sales & HRMS Supabase Tables Setup
--  File: create_sales_tables.sql
--
--  RUN IN: Supabase SQL Editor
--  https://supabase.com/dashboard/project/cljifufjjwrdgethvfvl/sql/new
-- ============================================================

-- 1. Create public.visits
CREATE TABLE IF NOT EXISTS public.visits (
    id TEXT PRIMARY KEY,
    visit_id TEXT,
    employee_id TEXT,
    employee_name TEXT,
    employee_phone TEXT,
    customer_id TEXT,
    customer_name TEXT,
    location TEXT,
    notes TEXT,
    status TEXT DEFAULT 'SCHEDULED',
    visit_date TEXT,
    visit_time TEXT,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    latitude NUMERIC,
    longitude NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create public.attendance
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    employee_name TEXT,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'Present',
    punch_in_time TEXT,
    punch_out_time TEXT,
    work_location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create public.expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    expense_id TEXT,
    user_id TEXT,
    employee_id TEXT,
    employee_name TEXT,
    employee_phone TEXT,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'INR',
    description TEXT,
    receipt_url TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create public.opportunities
CREATE TABLE IF NOT EXISTS public.opportunities (
    id TEXT PRIMARY KEY,
    opportunity_id TEXT,
    title TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    expected_revenue NUMERIC DEFAULT 0,
    stage TEXT DEFAULT 'QUALIFICATION',
    expected_closing_date TEXT,
    owner_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create public.notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    recipient_role TEXT DEFAULT 'all',
    recipient_id TEXT,
    recipient_email TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create public.followups
CREATE TABLE IF NOT EXISTS public.followups (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    customer_name TEXT NOT NULL,
    followup_date DATE,
    reminder_time TEXT,
    notes TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS & Grant Access to Anon/Authenticated Roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;

ALTER TABLE public.visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups DISABLE ROW LEVEL SECURITY;
