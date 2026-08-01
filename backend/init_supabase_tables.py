import sys
import os
sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client

admin_client = get_supabase_admin_client()

create_employees_sql = """
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT,
    department TEXT,
    status TEXT DEFAULT 'Active',
    last_login TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
"""

create_organization_settings_sql = """
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
"""

create_leads_sql = """
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    name TEXT,
    company TEXT,
    email TEXT,
    phone TEXT,
    source TEXT,
    status TEXT DEFAULT 'NEW',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
"""

create_customers_sql = """
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT,
    company TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
"""

print("--- CREATING SUPABASE TABLES VIA RPC ---")
for name, sql in [("employees", create_employees_sql), ("organization_settings", create_organization_settings_sql), ("leads", create_leads_sql), ("customers", create_customers_sql)]:
    try:
        res = admin_client.rpc("exec_sql", {"sql_query": sql}).execute()
        print(f"✅ Created table '{name}'")
    except Exception as e:
        print(f"⚠️ RPC exec_sql for '{name}': {e}")
