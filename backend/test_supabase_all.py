import sys
import os

sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client, get_supabase_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum

client = get_supabase_admin_client() or get_supabase_client()
helper = get_schema_helper()

print("==========================================")
print("CHECKING EXISTING TABLES ACROSS ALL SCHEMAS")
print("==========================================")

for schema in SchemaEnum:
    for tbl in ["employees", "customers", "leads", "expenses", "field_visits", "attendance_logs", "notifications", "business_settings", "opportunities", "users", "profiles", "todos"]:
        try:
            res = helper.table(schema, tbl).select("*").limit(1).execute()
            print(f"[FOUND] Schema '{schema.value}.{tbl}' exists! rows={len(res.data) if res.data is not None else 0}")
        except Exception as e:
            pass

print("==========================================")
print("CHECKING PUBLIC TABLES")
print("==========================================")

for tbl in ["employees", "customers", "leads", "expenses", "field_visits", "attendance_logs", "notifications", "business_settings", "opportunities", "users", "profiles", "todos", "tc_todos", "tc_expenses", "tc_field_visits", "tc_eod_reports"]:
    try:
        res = client.table(tbl).select("*").limit(1).execute()
        print(f"[FOUND] Public table '{tbl}' exists! rows={len(res.data) if res.data is not None else 0}")
    except Exception as e:
        pass

print("==========================================")
