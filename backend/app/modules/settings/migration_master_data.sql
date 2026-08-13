-- ============================================================
-- TwiteConnect Master Data Schema Setup Script
-- Creates normalized tables for master settings
-- ============================================================

CREATE TABLE IF NOT EXISTS organization.designations (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization.products (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    price TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization.lead_sources (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization.customer_categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant table-level permissions to Supabase API and worker roles
GRANT ALL PRIVILEGES ON TABLE 
    organization.designations, 
    organization.products, 
    organization.lead_sources, 
    organization.customer_categories 
TO anon, authenticated, service_role, postgres;
