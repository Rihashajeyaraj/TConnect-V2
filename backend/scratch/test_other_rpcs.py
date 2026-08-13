import sys
import os

sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client

def test_other_rpcs():
    sb = get_supabase_admin_client()
    rpc_names = ["execute_sql", "run_sql", "raw_sql", "sql", "query", "exec_query", "run_query"]
    for name in rpc_names:
        try:
            res = sb.rpc(name, {"sql_query": "SELECT 1;"}).execute()
            print(f"✅ SUCCESS with RPC name '{name}'! Response: {res.data}")
            return
        except Exception as e:
            err = str(e)
            if "PGRST202" not in err:
                print(f"❓ RPC '{name}' exists but errored: {err}")
            else:
                print(f"❌ RPC '{name}': Not found (PGRST202)")

if __name__ == "__main__":
    test_other_rpcs()
