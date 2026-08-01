import sys
import os
import uuid
sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client, get_supabase_client

admin = get_supabase_admin_client() or get_supabase_client()

print("--- TESTING SUPABASE CLIENT AND INSERT PERMISSIONS ---")

# 1. Test Supabase Auth Admin create_user
try:
    auth_res = admin.auth.admin.create_user({
        "email": f"test.user.{uuid.uuid4().hex[:6]}@twiteconnect.com",
        "password": "TestPassword2026#",
        "email_confirm": True,
        "user_metadata": {"role": "Sales Executive", "full_name": "Test Account"}
    })
    print("✅ AUTH ADMIN CREATE_USER SUCCESS:", getattr(auth_res, "user", auth_res))
except Exception as e:
    print("❌ AUTH ADMIN CREATE_USER EXCEPTION:", e)

# 2. Test Inserting into public.employees / hrms.employees
emp_payload = {
    "employee_id": str(uuid.uuid4()),
    "employee_code": "EMP-999",
    "first_name": "Test",
    "last_name": "Employee",
    "email": f"emp.{uuid.uuid4().hex[:6]}@tconnect.com",
    "designation": "Sales Executive",
    "status": "Active"
}

try:
    res = admin.table("employees").insert(emp_payload).execute()
    print("✅ PUBLIC.EMPLOYEES INSERT SUCCESS:", res.data)
except Exception as e:
    print("❌ PUBLIC.EMPLOYEES INSERT EXCEPTION:", e)

try:
    res = admin.schema("hrms").table("employees").insert(emp_payload).execute()
    print("✅ HRMS.EMPLOYEES INSERT SUCCESS:", res.data)
except Exception as e:
    print("❌ HRMS.EMPLOYEES INSERT EXCEPTION:", e)
