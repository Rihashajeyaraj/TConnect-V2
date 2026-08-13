import sys
import os

sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client

def test_exec_sql_signatures():
    sb = get_supabase_admin_client()
    
    # Try different parameter names
    signatures = [
        {"query": "SELECT 1;"},
        {"sql_query": "SELECT 1;"},
        {"sql": "SELECT 1;"},
        {"sql_text": "SELECT 1;"},
        {"p_query": "SELECT 1;"},
        {"query_text": "SELECT 1;"}
    ]
    
    for sig in signatures:
        param_name = list(sig.keys())[0]
        try:
            res = sb.rpc("exec_sql", sig).execute()
            print(f"✅ SUCCESS with parameter name '{param_name}'! Response: {res.data}")
            return
        except Exception as e:
            err = str(e)
            if "PGRST202" not in err:
                print(f"❓ Parameter '{param_name}': {err}")
            else:
                print(f"❌ Parameter '{param_name}': Not found (PGRST202)")

if __name__ == "__main__":
    test_exec_sql_signatures()
