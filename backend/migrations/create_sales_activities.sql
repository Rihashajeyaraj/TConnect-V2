-- ============================================================
-- TWITE CONNECT - SALES ACTIVITIES SCHEMA MIGRATION
-- Create unified log table for sales activities
-- ============================================================

CREATE SCHEMA IF NOT EXISTS sales;
GRANT USAGE ON SCHEMA sales TO anon, authenticated, service_role, postgres;

CREATE TABLE IF NOT EXISTS sales.sales_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    executive_id TEXT,
    executive_email TEXT,
    activity_type TEXT NOT NULL,
    description TEXT,
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Fallback in public schema if needed
CREATE TABLE IF NOT EXISTS public.sales_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    executive_id TEXT,
    executive_email TEXT,
    activity_type TEXT NOT NULL,
    description TEXT,
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Grants
GRANT ALL ON TABLE sales.sales_activities TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.sales_activities TO anon, authenticated, service_role, postgres;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_activities_exec_id ON sales.sales_activities (executive_id);
CREATE INDEX IF NOT EXISTS idx_sales_activities_exec_email ON sales.sales_activities (executive_email);
CREATE INDEX IF NOT EXISTS idx_sales_activities_created_at ON sales.sales_activities (created_at);
