import sys
import os

sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client

def list_routines():
    sb = get_supabase_admin_client()
    try:
        res = sb.schema("information_schema").table("routines").select("routine_name,data_type").eq("routine_schema", "public").execute()
        print("Functions found in public schema:")
        for row in res.data:
            print(f"  - {row['routine_name']} -> returns {row['data_type']}")
    except Exception as e:
        print("Error fetching routines:", e)

if __name__ == "__main__":
    list_routines()
