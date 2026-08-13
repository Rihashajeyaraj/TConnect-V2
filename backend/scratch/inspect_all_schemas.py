import sys
import os

sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client

def inspect_schemas():
    sb = get_supabase_admin_client()
    
    schema_tables = {
        "hrms": ["employees", "attendance", "leave_requests", "enrollments"],
        "organization": ["organization_settings", "designations", "products", "lead_sources", "customer_categories"],
        "crm": ["leads", "customers", "opportunities"],
        "field_management": ["visits"],
        "finance": ["expenses"],
        "system": ["notifications", "reports_eod", "todos", "audit_logs"]
    }
    
    for schema, tables in schema_tables.items():
        print(f"=== Schema: {schema} ===")
        for t in tables:
            try:
                res = sb.schema(schema).table(t).select("*").limit(1).execute()
                print(f"  [OK] Table '{t}' EXISTS. Columns: {list(res.data[0].keys()) if res.data else 'EMPTY'}")
            except Exception as e:
                print(f"  [ERROR] Table '{t}': {e}")
        print()

if __name__ == "__main__":
    inspect_schemas()
