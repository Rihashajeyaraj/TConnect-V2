import sys
import os
sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client

client = get_supabase_admin_client()

candidates = [
    "employees", "profiles", "user_profiles", "users",
    "organization_settings", "company_settings", "company", "settings",
    "leads", "customers", "visits", "attendance", "expenses", "pipeline", "opportunities"
]

print("--- TESTING PUBLIC TABLES ---")
existing_tables = []
for t in candidates:
    try:
        res = client.table(t).select("*").limit(1).execute()
        print(f"[FOUND] TABLE EXISTS: '{t}' (Rows: {len(res.data) if res.data else 0})")
        existing_tables.append(t)
    except Exception as e:
        err = str(e)
        if "PGRST205" in err or "Could not find the table" in err:
            print(f"[MISSING] Table '{t}' does not exist")
        else:
            print(f"[ERROR] Table '{t}' error: {err}")

print("\nSUMMARY OF EXISTING TABLES:", existing_tables)
