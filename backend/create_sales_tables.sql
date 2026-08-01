-- ============================================================
--  TwiteConnect Sales Executive Tables Setup
--  File: create_sales_tables.sql
--
--  RUN IN: Supabase SQL Editor
--  https://supabase.com/dashboard/project/cljifufjjwrdgethvfvl/sql/new
-- ============================================================

-- 1. Create public.visits
CREATE TABLE IF NOT EXISTS public.visits (
    id TEXT PRIMARY KEY,
    visit_id TEXT,
    title TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT DEFAULT 'SCHEDULED',
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    latitude NUMERIC,
    longitude NUMERIC,
    location_name TEXT,
    notes TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create public.attendance_logs
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id TEXT PRIMARY KEY,
    attendance_id TEXT,
    user_id TEXT NOT NULL,
    clock_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clock_out_time TIMESTAMPTZ,
    clock_in_lat NUMERIC,
    clock_in_lng NUMERIC,
    location_name TEXT,
    status TEXT DEFAULT 'PRESENT',
    notes TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create public.expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    expense_id TEXT,
    user_id TEXT NOT NULL,
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
    expected_revenue NUMERIC NOT NULL,
    stage TEXT DEFAULT 'QUALIFICATION',
    expected_closing_date TEXT,
    owner_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create public.notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create public.followups
CREATE TABLE IF NOT EXISTS public.followups (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    followup_date DATE NOT NULL,
    reminder_time TEXT,
    notes TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant Access to Authenticator/Anon/Service Role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
ALTER TABLE public.visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups DISABLE ROW LEVEL SECURITY;
