-- TwiteConnect Complete Database Schema Setup Script for Supabase
-- Paste and run this script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/cljifufjjwrdgethvfvl/sql/new

-- 1. Employees / System Users Table
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'Sales Executive',
    department TEXT DEFAULT 'Sales',
    status TEXT DEFAULT 'Active',
    last_login TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Organization / Company Settings Table
CREATE TABLE IF NOT EXISTS public.organization_settings (
    id TEXT PRIMARY KEY,
    company_name TEXT,
    registration_no TEXT,
    gst_no TEXT,
    pan_no TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    website TEXT,
    logo_url TEXT,
    currency TEXT DEFAULT 'INR',
    branches JSONB DEFAULT '[]'::jsonb,
    departments JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CRM Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    source TEXT,
    status TEXT DEFAULT 'NEW',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Customer Accounts Table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Field Visits Table
CREATE TABLE IF NOT EXISTS public.visits (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    location TEXT,
    purpose TEXT,
    status TEXT DEFAULT 'SCHEDULED',
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Attendance Logs Table
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    employee_name TEXT,
    date DATE DEFAULT CURRENT_DATE,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    status TEXT DEFAULT 'PRESENT',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    category TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Sales Pipeline / Opportunities Table
CREATE TABLE IF NOT EXISTS public.opportunities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT,
    value NUMERIC DEFAULT 0,
    stage TEXT DEFAULT 'LEAD',
    owner_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) policies (Optional / Admin access bypasses RLS)
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities DISABLE ROW LEVEL SECURITY;

-- Insert initial organization profile row
INSERT INTO public.organization_settings (id, company_name, email, phone, currency)
VALUES ('org_001', 'TConnect Solutions', 'support@tconnect.com', '+91 98765 43210', 'INR')
ON CONFLICT (id) DO NOTHING;
