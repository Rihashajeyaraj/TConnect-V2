import os
import sys
from supabase import create_client

NEW_URL = "https://kzmeyssfgfybfrjczutg.supabase.co"
NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bWV5c3NmZ2Z5YmZyamN6dXRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTU3MjM0OCwiZXhwIjoyMTA1MTQ4MzQ4fQ.QWTrXhg09UifqdKtuwg_mzZdOFjHbS2gX2vCJqm-Wq4"

def sync_auth_users():
    print("--- Syncing All 17 Employees into New Supabase Auth (auth.users) ---")
    client = create_client(NEW_URL, NEW_KEY)

    # Fetch employees from new DB hrms.employees
    try:
        res = client.schema("hrms").table("employees").select("*").execute()
        emps = res.data or []
    except Exception:
        res = client.table("employees").select("*").execute()
        emps = res.data or []

    if not emps:
        print("[ERROR] No employees found in hrms.employees to sync.")
        return

    print(f"Found {len(emps)} employee record(s). Creating Auth accounts in Supabase Auth...")

    created_count = 0
    for emp in emps:
        email = str(emp.get("email") or "").strip().lower()
        if not email or "@" not in email:
            continue

        emp_id = str(emp.get("employee_id") or emp.get("id") or emp.get("user_id") or "")
        emp_name = str(emp.get("name") or f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip() or "Employee")
        role = str(emp.get("role") or emp.get("designation") or "Sales Executive")
        emp_code = str(emp.get("employee_code") or "EMP0001")
        password = str(emp.get("accessPassword") or emp.get("password") or "TConnect2026#")

        if len(password) < 6:
            password = "TConnect2026#"

        try:
            # Create user in Supabase Auth via Admin Client API
            user_data = {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": emp_name,
                    "role": role,
                    "employee_code": emp_code,
                }
            }
            if emp_id and len(emp_id) == 36 and "-" in emp_id:
                user_data["id"] = emp_id

            res = client.auth.admin.create_user(user_data)
            created_count += 1
            print(f"   [SUCCESS] Created Auth User: {email} ({role}) [Pass: {password}]")
        except Exception as e:
            err_str = str(e)
            if "already" in err_str.lower() or "exists" in err_str.lower():
                print(f"   [EXISTS] Auth User already exists: {email}")
            else:
                print(f"   [NOTICE] Could not create Auth User {email}: {e}")

    print(f"\n--- Successfully synced {created_count} user(s) into Supabase Auth (auth.users)! ---")

if __name__ == "__main__":
    sync_auth_users()
