import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.supabase import get_supabase_admin_client

def run_migration():
    client = get_supabase_admin_client()
    if not client:
        print("Failed to initialize client")
        return

    m_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "migrations", "create_contacts_table.sql"))
    print(f"Reading: {m_path}")
    with open(m_path, "r") as f:
        sql = f.read()

    print("Running create_contacts_table.sql...")
    try:
        res = client.rpc("exec_sql", {"sql_query": sql}).execute()
        print(f"  [SUCCESS] create_contacts_table.sql migration output: {res.data}")
    except Exception as e:
        print(f"  [ERROR] Failed to run create_contacts_table.sql: {e}")

if __name__ == "__main__":
    run_migration()
