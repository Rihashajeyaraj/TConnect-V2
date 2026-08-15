import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.supabase import get_supabase_admin_client

def run_migrations():
    client = get_supabase_admin_client()
    if not client:
        print("Failed to initialize client")
        return

    # Migration 1: profile_schema_update.sql
    m1_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "profile_schema_update.sql"))
    print(f"Reading: {m1_path}")
    with open(m1_path, "r") as f:
        sql1 = f.read()

    print("Running profile_schema_update.sql...")
    try:
        res1 = client.rpc("exec_sql", {"sql_query": sql1}).execute()
        print(f"  [SUCCESS] profile_schema_update.sql migration output: {res1.data}")
    except Exception as e:
        print(f"  [ERROR] Failed to run profile_schema_update.sql: {e}")

    # Migration 2: add_profile_details_extended.sql
    m2_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "migrations", "add_profile_details_extended.sql"))
    print(f"Reading: {m2_path}")
    with open(m2_path, "r") as f:
        sql2 = f.read()

    print("Running add_profile_details_extended.sql...")
    try:
        res2 = client.rpc("exec_sql", {"sql_query": sql2}).execute()
        print(f"  [SUCCESS] add_profile_details_extended.sql migration output: {res2.data}")
    except Exception as e:
        print(f"  [ERROR] Failed to run add_profile_details_extended.sql: {e}")

if __name__ == "__main__":
    run_migrations()
