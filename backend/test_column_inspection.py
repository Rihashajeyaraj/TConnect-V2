import sys
import os

sys.path.insert(0, os.path.abspath("."))

from app.database.supabase import get_supabase_admin_client, get_supabase_client

def inspect_columns():
    supabase = get_supabase_admin_client() or get_supabase_client()
    print("==================================================")
    print("INSPECTING EXACT COLUMN NAMES IN SUPABASE")
    print("==================================================\n")

    # Fetch 1 row from leads
    try:
        res = supabase.table("leads").select("*").limit(1).execute()
        if res.data and len(res.data) > 0:
            print("LEADS table columns:", list(res.data[0].keys()))
            print("Sample Lead row:", res.data[0])
        else:
            print("LEADS table returned empty data.")
    except Exception as e:
        print("LEADS fetch error:", e)

    print("\n--------------------------------------------------\n")

    # Fetch 1 row from customers
    try:
        res = supabase.table("customers").select("*").limit(1).execute()
        if res.data and len(res.data) > 0:
            print("CUSTOMERS table columns:", list(res.data[0].keys()))
            print("Sample Customer row:", res.data[0])
        else:
            print("CUSTOMERS table returned empty data.")
    except Exception as e:
        print("CUSTOMERS fetch error:", e)

if __name__ == "__main__":
    inspect_columns()
