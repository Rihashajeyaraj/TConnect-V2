import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.supabase import get_supabase_admin_client, get_supabase_client

def main():
    client = get_supabase_admin_client() or get_supabase_client()
    try:
        res = client.schema("hrms").table("employees").select("*").execute()
        if res.data:
            print("Columns in hrms.employees:")
            print(list(res.data[0].keys()))
            print("\nRow 1 details:")
            for k, v in res.data[0].items():
                print(f"  {k}: {v}")
        else:
            print("No data in hrms.employees")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
