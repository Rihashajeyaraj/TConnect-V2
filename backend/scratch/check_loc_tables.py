import sys
import os

sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client

def check_existing_loc_tables():
    sb = get_supabase_admin_client()
    tables = ["employee_locations", "live_locations", "locations", "executive_locations"]
    for t in tables:
        try:
            res = sb.schema("hrms").table(t).select("*").limit(1).execute()
            print(f"✅ Table '{t}' EXISTS in hrms!")
        except Exception as e:
            print(f"❌ Table '{t}' not found: {e}")

if __name__ == "__main__":
    check_existing_loc_tables()
