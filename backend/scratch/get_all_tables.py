import sys
import os

sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client

def test_schemas():
    sb = get_supabase_admin_client()
    schemas = ['public', 'system', 'hrms', 'organization', 'crm', 'visit', 'finance', 'field_management']
    sql = "SELECT 1 as val;"
    for schema in schemas:
        try:
            res = sb.schema(schema).rpc("exec_sql", {"sql_query": sql}).execute()
            print(f"✅ FOUND exec_sql in schema '{schema}'! Response: {res.data}")
            return
        except Exception as e:
            print(f"❌ Scheme '{schema}': {e}")

if __name__ == "__main__":
    test_schemas()
