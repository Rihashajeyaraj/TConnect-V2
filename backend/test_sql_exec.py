import sys
import os

sys.path.insert(0, os.path.abspath("."))

from app.database.supabase import get_supabase_admin_client

def test_sql_exec():
    sb = get_supabase_admin_client()
    sql = """
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
    """
    print("Testing SQL execution...")
    try:
        res = sb.rpc("exec_sql", {"sql_query": sql}).execute()
        print("RPC exec_sql SUCCESS:", res.data)
    except Exception as e:
        print("RPC exec_sql notice:", e)

    # Check if psycopg2 or sqlalchemy is available
    for pkg in ["psycopg2", "pg8000", "sqlalchemy", "asyncpg"]:
        try:
            __import__(pkg)
            print(f"Package '{pkg}' is INSTALLED!")
        except ImportError:
            pass

if __name__ == "__main__":
    test_sql_exec()
