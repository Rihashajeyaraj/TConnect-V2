import sys
import os

sys.path.insert(0, os.path.abspath("."))

from app.database.supabase import get_supabase_admin_client, get_supabase_client

def discover_tables():
    supabase = get_supabase_admin_client() or get_supabase_client()
    print("==================================================")
    print("DISCOVERING ALL TABLES IN SUPABASE DATABASE")
    print("==================================================\n")

    possible_tables = [
        "leads", "crm_leads",
        "customers", "customer_accounts", "accounts",
        "visits", "visit_logs", "site_visits", "client_visits",
        "notifications", "app_notifications", "user_notifications",
        "attendance", "attendance_logs", "clock_logs", "user_attendance",
        "expenses", "expense_claims", "employee_expenses",
        "opportunities", "pipeline_opportunities", "crm_opportunities",
        "audit_logs", "activity_logs", "reports"
    ]

    found = []

    for t in possible_tables:
        try:
            res = supabase.table(t).select("*").limit(1).execute()
            if res.data is not None:
                found.append(t)
                print(f"[FOUND] Table '{t}' EXISTS. Row count/sample: {len(res.data)}")
                if len(res.data) > 0:
                    print(f"        Columns for '{t}':", list(res.data[0].keys()))
        except Exception as e:
            err_str = str(e)
            if "PGRST205" not in err_str and "Could not find" not in err_str:
                print(f"[EXISTS-ERROR] Table '{t}' exists but threw: {e}")

    print("\n--- SUMMARY ---")
    print(f"Discovered {len(found)} active tables in Supabase: {found}")

if __name__ == "__main__":
    discover_tables()
