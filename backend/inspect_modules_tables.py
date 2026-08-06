import sys
import os

sys.path.insert(0, os.path.abspath("."))

from app.database.supabase import get_supabase_admin_client, get_supabase_client

def inspect_all_tables():
    supabase = get_supabase_admin_client() or get_supabase_client()
    print("==================================================")
    print("INSPECTING SUPABASE TABLES: VISITS, NOTIFICATIONS, ATTENDANCE, AUDIT_LOGS")
    print("==================================================\n")

    tables = ["visits", "notifications", "attendance", "audit_logs", "activity_logs", "reports", "expenses"]

    for tbl in tables:
        try:
            res = supabase.table(tbl).select("*").limit(1).execute()
            if res.data is not None:
                if len(res.data) > 0:
                    print(f"✅ Table '{tbl}' COLUMNS:", list(res.data[0].keys()))
                else:
                    print(f"⚠️ Table '{tbl}' EXISTS but is currently EMPTY.")
            else:
                print(f"❌ Table '{tbl}' returned None")
        except Exception as e:
            print(f"❌ Table '{tbl}' FETCH ERROR:", e)

if __name__ == "__main__":
    inspect_all_tables()
