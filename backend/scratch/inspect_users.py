import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.supabase import get_supabase_admin_client, get_supabase_client

def main():
    client = get_supabase_admin_client() or get_supabase_client()
    print("--- HRMS Employees ---")
    try:
        res = client.schema("hrms").table("employees").select("*").execute()
        if res.data:
            for idx, emp in enumerate(res.data):
                print(f"{idx+1}. ID: {emp.get('id')} | Code: {emp.get('employee_code')} | Name: {emp.get('name')} | Email: {emp.get('email')} | Role: {emp.get('role')} | Mgr: {emp.get('reporting_manager_id')} ({emp.get('reporting_manager_name')})")
        else:
            print("No employees found")
    except Exception as e:
        print(f"Failed to fetch employees: {e}")

    print("\n--- Auth Users ---")
    try:
        admin_client = get_supabase_admin_client()
        auth_admin = getattr(admin_client, "auth", None)
        if auth_admin and hasattr(auth_admin, "admin"):
            res_users = auth_admin.admin.list_users()
            users_data = res_users if isinstance(res_users, list) else getattr(res_users, "users", [])
            for idx, u in enumerate(users_data):
                meta = getattr(u, "user_metadata", {}) or {}
                print(f"{idx+1}. ID: {u.id} | Email: {u.email} | Name: {meta.get('full_name')} | Role: {meta.get('role')}")
        else:
            print("No Auth Admin client available")
    except Exception as e:
        print(f"Failed to fetch auth users: {e}")

if __name__ == "__main__":
    main()
