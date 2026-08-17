import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.supabase import get_supabase_admin_client

def main():
    client = get_supabase_admin_client()
    if not client:
        print("Failed to initialize admin client")
        return

    sql = """
    ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS annual_leaves INTEGER DEFAULT 12;
    ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS half_day_permissions INTEGER DEFAULT 6;
    ALTER TABLE hrms.employees ADD COLUMN IF NOT EXISTS short_permissions INTEGER DEFAULT 2;
    """

    print("Running migration to add leave columns...")
    try:
        res = client.rpc("exec_sql", {"sql_query": sql}).execute()
        print(f"[SUCCESS] Migration completed! Output: {res.data}")
    except Exception as e:
        print(f"[ERROR] Failed to run migration: {e}")

if __name__ == "__main__":
    main()
