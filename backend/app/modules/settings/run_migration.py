import os
import sys

sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client, get_supabase_client

def run():
    client = get_supabase_admin_client() or get_supabase_client()
    sql_file = os.path.join(os.path.dirname(__file__), "migration_master_data.sql")
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
        print("✅ Master Data schema migration completed successfully!")
    except Exception as e:
        print(f"❌ Migration error: {e}")

if __name__ == "__main__":
    run()
