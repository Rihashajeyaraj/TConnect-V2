-- ============================================================
-- TwiteConnect Contacts Schema Setup Script
-- Creates contacts table for centralized client profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS crm.contacts (
    id TEXT PRIMARY KEY DEFAULT ('CN-' || substr(uuid_generate_v4()::text, 1, 8)),
    company_name TEXT UNIQUE NOT NULL,
    contact_person TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    city TEXT,
    address TEXT,
    assigned_to TEXT,
    assigned_to_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant table-level permissions to Supabase API and worker roles
GRANT ALL PRIVILEGES ON TABLE crm.contacts TO anon, authenticated, service_role, postgres;
