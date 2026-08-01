import sys
import os
sys.path.insert(0, os.path.abspath("."))

from app.database.supabase import get_supabase_admin_client, get_supabase_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum

print("--- TESTING SUPABASE EMPLOYEES INSERT ---")

admin_client = get_supabase_admin_client()
anon_client = get_supabase_client()
helper = get_schema_helper()

test_employee = {
    "name": "Test Employee",
    "email": "test.emp@tconnect.com",
    "phone": "+91 99999 88888",
    "role": "Sales Executive",
    "department": "Sales & Business Development",
    "status": "Active"
}

# 1. Test insert via Schema Helper (hrms.employees)
print("\n1. Trying schema_helper table(SchemaEnum.HRMS, 'employees'):")
try:
    res = helper.table(SchemaEnum.HRMS, "employees").insert(test_employee).execute()
    print("SUCCESS (Schema Helper):", res.data)
except Exception as e:
    print("FAILED (Schema Helper):", e)

# 2. Test insert via Admin client (public.employees)
print("\n2. Trying admin_client.table('employees'):")
try:
    res = admin_client.table("employees").insert(test_employee).execute()
    print("SUCCESS (Admin public.employees):", res.data)
except Exception as e:
    print("FAILED (Admin public.employees):", e)

# 3. Test insert via Admin client (public.users)
print("\n3. Trying admin_client.table('users'):")
try:
    res = admin_client.table("users").insert(test_employee).execute()
    print("SUCCESS (Admin public.users):", res.data)
except Exception as e:
    print("FAILED (Admin public.users):", e)

# 4. Test select employees
print("\n4. Trying admin_client.table('employees').select('*'):")
try:
    res = admin_client.table("employees").select("*").execute()
    print("SUCCESS select employees:", len(res.data) if res.data else 0, "rows found")
    if res.data:
        print("First row:", res.data[0])
except Exception as e:
    print("FAILED select employees:", e)
