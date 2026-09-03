-- ============================================================
-- TWITE CONNECT - DYNAMIC CONFIGURATION & MASTER DATA TABLES
-- Migration script for production database configuration
-- ============================================================

CREATE SCHEMA IF NOT EXISTS hrms;
CREATE SCHEMA IF NOT EXISTS organization;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS sales;
CREATE SCHEMA IF NOT EXISTS system;

GRANT USAGE ON SCHEMA hrms, organization, finance, sales, system TO anon, authenticated, service_role, postgres;

-- 1. HOLIDAYS TABLE
CREATE TABLE IF NOT EXISTS hrms.holidays (
    id TEXT PRIMARY KEY DEFAULT ('HOL-' || substr(uuid_generate_v4()::text, 1, 8)),
    name TEXT NOT NULL,
    date DATE NOT NULL,
    year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    type TEXT DEFAULT 'Mandatory', -- 'Mandatory', 'Optional', 'National', 'Festival', 'Regional'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HANDBOOK & POLICY DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS organization.handbook_documents (
    id TEXT PRIMARY KEY DEFAULT ('HDB-' || substr(uuid_generate_v4()::text, 1, 8)),
    title TEXT NOT NULL,
    category TEXT DEFAULT 'General Guidelines', -- 'Sales Procedures', 'Call Etiquette', 'Visit Protocol', 'Commission Policy', 'EOD Reporting', 'HR Policies'
    content TEXT NOT NULL,
    version INT DEFAULT 1,
    status TEXT DEFAULT 'Published', -- 'Draft', 'Published', 'Archived'
    created_by TEXT,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LOCATION LANDMARKS MASTER TABLE
CREATE TABLE IF NOT EXISTS organization.location_landmarks (
    id TEXT PRIMARY KEY DEFAULT ('LND-' || substr(uuid_generate_v4()::text, 1, 8)),
    name TEXT NOT NULL,
    aliases JSONB DEFAULT '[]'::jsonb,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    city TEXT DEFAULT 'Chennai',
    area TEXT DEFAULT 'Chennai South',
    type TEXT DEFAULT 'locality', -- 'locality', 'mall', 'transit', 'hub'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DEPARTMENTS MASTER TABLE
CREATE TABLE IF NOT EXISTS organization.departments (
    id TEXT PRIMARY KEY DEFAULT ('DEPT-' || substr(uuid_generate_v4()::text, 1, 8)),
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    manager_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EMPLOYEE REQUIRED DOCUMENT TYPES TABLE
CREATE TABLE IF NOT EXISTS organization.document_types (
    id TEXT PRIMARY KEY DEFAULT ('DCT-' || substr(uuid_generate_v4()::text, 1, 8)),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    required BOOLEAN DEFAULT TRUE,
    applicable_role TEXT DEFAULT 'ALL',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. COMMISSION & INCENTIVE RULES TABLE
CREATE TABLE IF NOT EXISTS finance.commission_rules (
    id TEXT PRIMARY KEY DEFAULT ('CMR-' || substr(uuid_generate_v4()::text, 1, 8)),
    title TEXT DEFAULT 'Standard Sales Commission',
    min_value NUMERIC DEFAULT 0,
    max_value NUMERIC,
    commission_type TEXT DEFAULT 'Percentage', -- 'Percentage', 'FlatAmount'
    commission_value NUMERIC DEFAULT 5.0,
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant Table Permissions
GRANT ALL ON ALL TABLES IN SCHEMA hrms, organization, finance, sales, system TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA hrms, organization, finance, sales, system TO anon, authenticated, service_role, postgres;
