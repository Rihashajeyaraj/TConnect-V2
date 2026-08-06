import sys
import os

sys.path.insert(0, os.path.abspath("."))

from app.database.supabase import get_supabase_admin_client, get_supabase_client

def main():
    supabase = get_supabase_admin_client() or get_supabase_client()
    print("==================================================")
    print("SAFE SCHEMA INSPECTOR")
    print("==================================================\n")

    tables = ["visits", "notifications", "attendance", "audit_logs", "activity_logs", "reports", "expenses"]

    for t in tables:
        try:
            res = supabase.table(t).select("*").limit(1).execute()
            if res.data is not None:
                if len(res.data) > 0:
                    print(f"Table '{t}' COLUMNS: {list(res.data[0].keys())}")
                else:
                    print(f"Table '{t}' EXISTS but is currently EMPTY.")
            else:
                print(f"Table '{t}' returned None.")
        except Exception as e:
            print(f"Table '{t}' fetch error: {e}")

if __name__ == "__main__":
    main()
