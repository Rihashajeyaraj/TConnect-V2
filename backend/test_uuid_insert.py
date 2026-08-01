import sys
import os
import uuid
sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client, get_supabase_client

admin = get_supabase_admin_client() or get_supabase_client()

print("--- TESTING UUID INSERT IN PUBLIC AND HRMS EMPLOYEES ---")

valid_uuid = str(uuid.uuid4())
payload = {
    "employee_id": valid_uuid,
    "employee_code": "EMP-777",
    "first_name": "Ashwini",
    "last_name": "V",
    "email": "ashwini@twite.ai",
    "designation": "Sales Executive",
    "status": "Active"
}

try:
    res = admin.table("employees").insert(payload).execute()
    print("🎉 SUCCESSFUL INSERT INTO PUBLIC.EMPLOYEES:", res.data)
except Exception as e:
    print("❌ PUBLIC.EMPLOYEES INSERT ERROR:", e)

try:
    res = admin.schema("hrms").table("employees").insert(payload).execute()
    print("🎉 SUCCESSFUL INSERT INTO HRMS.EMPLOYEES:", res.data)
except Exception as e:
    print("❌ HRMS.EMPLOYEES INSERT ERROR:", e)
