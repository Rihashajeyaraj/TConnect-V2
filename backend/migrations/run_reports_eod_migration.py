import os
import sys

# Insert parent directory of backend/migrations into sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.supabase import get_supabase_admin_client, get_supabase_client

def run():
    client = get_supabase_admin_client() or get_supabase_client()
    sql_file = os.path.join(os.path.dirname(__file__), "update_reports_eod_schema.sql")
    print(f"Reading migration file: {sql_file}")
    
    if not os.path.exists(sql_file):
        print(f"ERROR: Migration file {sql_file} does not exist!")
        return

    with open(sql_file, "r") as f:
        sql = f.read()

    print("Running SQL migration in Supabase...")
    try:
        res = client.rpc("exec_sql", {"sql_query": sql}).execute()
        print("MIGRATION RESPONSE:", res.data)
        print("[SUCCESS] reports_eod table schema updates completed successfully!")
    except Exception as e:
        print(f"[ERROR] Migration error: {e}")

if __name__ == "__main__":
    run()
