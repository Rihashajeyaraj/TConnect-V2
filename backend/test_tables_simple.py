import sys
import os

sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client, get_supabase_client

client = get_supabase_admin_client() or get_supabase_client()

tables = ["employees", "customers", "leads", "expenses", "field_visits", "attendance_logs", "notifications", "business_settings", "opportunities", "users", "profiles", "todos"]

print("--- PUBLIC TABLES DISCOVERY ---")
for tbl in tables:
    try:
        res = client.table(tbl).select("*").limit(1).execute()
        print(f"Table '{tbl}': EXISTS ({len(res.data) if res.data is not None else 0} rows)")
    except Exception as e:
        print(f"Table '{tbl}': MISSING ({str(e)[:60]})")
