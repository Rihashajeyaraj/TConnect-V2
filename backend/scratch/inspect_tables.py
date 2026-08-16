import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.supabase import get_supabase_admin_client

def main():
    client = get_supabase_admin_client()
    if not client:
        print("Failed to init admin client")
        return
        
    print("Testing exec_sql across schemas...")
    for schema in ["public", "system", "organization", "hrms", "finance", "crm"]:
        try:
            res = client.schema(schema).rpc("exec_sql", {"sql_query": "SELECT 1;"}).execute()
            print(f"SUCCESS: exec_sql exists in schema '{schema}'! Data: {res.data}")
        except Exception as e:
            err_msg = str(e)
            if "Could not find the function" in err_msg:
                print(f"FAILED: exec_sql not in schema '{schema}'")
            else:
                print(f"ERROR in schema '{schema}': {err_msg}")

if __name__ == "__main__":
    main()
