-- ============================================================
-- TWITE CONNECT - SALES TARGET SCHEMA & TABLE MIGRATION
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================

-- 1. Create 'sales' schema if it does not exist
CREATE SCHEMA IF NOT EXISTS sales;
GRANT USAGE ON SCHEMA sales TO anon, authenticated, service_role, postgres;

-- 2. Create 'sales_target' table
CREATE TABLE IF NOT EXISTS sales.sales_target (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id TEXT,
    manager_name TEXT,
    manager_email TEXT,
    executive_id TEXT,
    executive_code TEXT,
    executive_name TEXT,
    executive_email TEXT,
    target_amount NUMERIC NOT NULL DEFAULT 500000,
    achieved_amount NUMERIC DEFAULT 0,
    period TEXT DEFAULT 'Monthly',
    start_date DATE,
    end_date DATE,
    notes TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Also ensure public fallback table exists if needed
CREATE TABLE IF NOT EXISTS public.sales_target (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id TEXT,
    manager_name TEXT,
    manager_email TEXT,
    executive_id TEXT,
    executive_code TEXT,
    executive_name TEXT,
    executive_email TEXT,
    target_amount NUMERIC NOT NULL DEFAULT 500000,
    achieved_amount NUMERIC DEFAULT 0,
    period TEXT DEFAULT 'Monthly',
    start_date DATE,
    end_date DATE,
    notes TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Grants
GRANT ALL ON TABLE sales.sales_target TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.sales_target TO anon, authenticated, service_role, postgres;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_target_manager_id ON sales.sales_target (manager_id);
CREATE INDEX IF NOT EXISTS idx_sales_target_manager_email ON sales.sales_target (manager_email);
CREATE INDEX IF NOT EXISTS idx_sales_target_executive_id ON sales.sales_target (executive_id);
CREATE INDEX IF NOT EXISTS idx_sales_target_executive_email ON sales.sales_target (executive_email);
CREATE INDEX IF NOT EXISTS idx_sales_target_start_date ON sales.sales_target (start_date);
