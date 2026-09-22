import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.supabase import get_supabase_admin_client, get_supabase_client

def run():
    client = get_supabase_admin_client() or get_supabase_client()
    sql_file = os.path.join(os.path.dirname(__file__), "create_user_messages_table.sql")
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
        print("[SUCCESS] user_messages table created successfully via exec_sql!")
    except Exception as e:
        print(f"[NOTE] rpc exec_sql not cached, attempting direct insert check on user_messages: {e}")
        try:
            client.table("user_messages").select("id").limit(1).execute()
            print("[SUCCESS] user_messages table is ready in Supabase database!")
        except Exception as e2:
            print(f"[INFO] user_messages table initial check: {e2}")

if __name__ == "__main__":
    run()
