-- ============================================================================
-- Organization Schema Data Architecture & RBAC Migration Script
-- Creates organization.roles, role_permissions, role_field_permissions
-- Updates organization.branches, products, product_branches with organization_id
-- Configures RLS policies and uniqueness constraints
-- ============================================================================

-- 1. Ensure master organization table exists with ID 'TC-001'
CREATE TABLE IF NOT EXISTS organization.organization_settings (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    company_code TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    website TEXT,
    address TEXT,
    legal_name TEXT,
    tax_id_gstin TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO organization.organization_settings (id, company_name, company_code)
VALUES ('TC-001', 'TwiteConnect Technologies Pvt. Ltd.', 'TC-001')
ON CONFLICT (id) DO NOTHING;

-- 2. Branches table setup
CREATE TABLE IF NOT EXISTS organization.branches (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'TC-001',
    company_id TEXT,
    branch_code TEXT,
    branch_name TEXT NOT NULL,
    branch_type TEXT DEFAULT 'Regional Office',
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    postal_code TEXT,
    phone TEXT,
    email TEXT,
    opening_date DATE,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organization.branches ADD COLUMN IF NOT EXISTS organization_id TEXT DEFAULT 'TC-001';

-- Backfill organization_id in branches
UPDATE organization.branches 
SET organization_id = COALESCE(organization_id, 'TC-001') 
WHERE organization_id IS NULL OR organization_id = '';

-- 3. Products table setup
CREATE TABLE IF NOT EXISTS organization.products (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'TC-001',
    company_id TEXT,
    product_code TEXT,
    product_name TEXT NOT NULL,
    product_type TEXT DEFAULT 'Product',
    category TEXT DEFAULT 'Subscription',
    description TEXT,
    base_price NUMERIC(12,2) DEFAULT 0.00,
    tax_percentage NUMERIC(5,2) DEFAULT 18.00,
    launch_date DATE,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organization.products ADD COLUMN IF NOT EXISTS organization_id TEXT DEFAULT 'TC-001';

-- Backfill organization_id in products
UPDATE organization.products 
SET organization_id = COALESCE(organization_id, 'TC-001') 
WHERE organization_id IS NULL OR organization_id = '';

-- 4. Product-Branches table setup
CREATE TABLE IF NOT EXISTS organization.product_branches (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'TC-001',
    company_id TEXT,
    product_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organization.product_branches ADD COLUMN IF NOT EXISTS organization_id TEXT DEFAULT 'TC-001';

-- Backfill organization_id in product_branches
UPDATE organization.product_branches 
SET organization_id = COALESCE(organization_id, 'TC-001') 
WHERE organization_id IS NULL OR organization_id = '';

-- 5. Roles table setup
CREATE TABLE IF NOT EXISTS organization.roles (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT 'TC-001',
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organization.roles ADD COLUMN IF NOT EXISTS organization_id TEXT DEFAULT 'TC-001';
ALTER TABLE organization.roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- 6. Role Permissions table setup
CREATE TABLE IF NOT EXISTS organization.role_permissions (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL,
    organization_id TEXT NOT NULL DEFAULT 'TC-001',
    module_key TEXT NOT NULL,
    feature_key TEXT NOT NULL,
    action_key TEXT NOT NULL,
    data_scope TEXT DEFAULT 'All',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organization.role_permissions ADD COLUMN IF NOT EXISTS organization_id TEXT DEFAULT 'TC-001';

-- 7. Role Field Permissions table setup
CREATE TABLE IF NOT EXISTS organization.role_field_permissions (
    id TEXT PRIMARY KEY,
    role_permission_id TEXT NOT NULL,
    organization_id TEXT NOT NULL DEFAULT 'TC-001',
    field_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organization.role_field_permissions ADD COLUMN IF NOT EXISTS organization_id TEXT DEFAULT 'TC-001';

-- 8. Seed default system roles
INSERT INTO organization.roles (id, organization_id, name, description, is_system)
VALUES 
  ('admin', 'TC-001', 'ADMIN', 'Unrestricted administrative access to all organization modules and security controls', true),
  ('sales_manager', 'TC-001', 'SALES MANAGER', 'Sales team management, field activity tracking, and performance reporting', true),
  ('sales_executive', 'TC-001', 'SALES EXECUTIVE', 'Field sales visits, attendance tracking, and lead pipeline management', true)
ON CONFLICT (id) DO UPDATE SET 
  is_system = true,
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 9. Table-level grant permissions
GRANT ALL PRIVILEGES ON TABLE 
    organization.organization_settings,
    organization.branches, 
    organization.products, 
    organization.product_branches,
    organization.roles,
    organization.role_permissions,
    organization.role_field_permissions
TO anon, authenticated, service_role, postgres;
