import sys
import os
import uuid

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.supabase import get_supabase_admin_client, get_supabase_client
from app.modules.hrms.repository import HRMSRepository

def seed_sample_ceo():
    print("Initializing Supabase Clients...")
    admin_client = get_supabase_admin_client()
    client = get_supabase_client()

    email = "ceo.test@tconnect.com"
    password = "Admin2026#"
    role = "CEO / Founder"
    full_name = "Sample CEO"

    print(f"Checking if user {email} already exists in Auth...")
    user_id = None
    
    if admin_client:
        try:
            users_list = admin_client.auth.admin.list_users()
            users = users_list if isinstance(users_list, list) else getattr(users_list, "users", [])
            for u in users:
                if u.email.lower() == email.lower():
                    print(f"User {email} already exists in Supabase Auth. ID: {u.id}")
                    user_id = str(u.id)
                    break
        except Exception as e:
            print(f"Could not search user list: {e}")

    if not user_id:
        print("Creating user in Supabase Auth...")
        if admin_client:
            try:
                res = admin_client.auth.admin.create_user({
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {
                        "role": role,
                        "full_name": full_name,
                        "designation": role,
                        "department": "Executive Office"
                    }
                })
                user_id = str(res.id)
                print(f"Created user successfully. Auth ID: {user_id}")
            except Exception as e:
                print(f"Admin create_user failed: {e}")
        
        if not user_id:
            try:
                res = client.auth.sign_up({
                    "email": email,
                    "password": password,
                    "options": {
                        "data": {
                            "role": role,
                            "full_name": full_name,
                            "designation": role,
                            "department": "Executive Office"
                        }
                    }
                })
                user_id = str(res.user.id)
                print(f"Signed up user successfully. Auth ID: {user_id}")
            except Exception as e:
                print(f"Sign up failed: {e}")
                # Generate a random UUID as fallback for database insertion
                user_id = str(uuid.uuid4())
                print(f"Fallback generated ID: {user_id}")

    # Synchronize to hrms.employees table
    print("Syncing user to database table...")
    hrms_repo = HRMSRepository()
    
    payload = {
        "employee_id": user_id,
        "auth_user_id": user_id,
        "employee_code": "TC-EMP-CEO-TEST",
        "first_name": "Sample",
        "last_name": "CEO",
        "email": email,
        "phone": "+91 99999 77777",
        "designation": role,
        "department": "Executive Office",
        "employment_status": "Active",
        "status": "Active"
    }

    try:
        # Check if already exists in DB
        res = client.schema("hrms").table("employees").select("*").eq("email", email).execute()
        if res.data and len(res.data) > 0:
            print("Employee record already exists in database.")
        else:
            inserted = hrms_repo._insert_employee_record(payload)
            if inserted:
                print(f"Successfully synced employee to database: {inserted}")
            else:
                # Direct public schema fallback
                client.table("employees").insert(payload).execute()
                print("Successfully inserted into fallback public.employees table.")
    except Exception as e:
        print(f"Failed to sync to database: {e}")
        try:
            # Try to insert directly via raw table just in case
            client.table("employees").insert({
                "employee_id": user_id,
                "first_name": "Sample",
                "last_name": "CEO",
                "email": email,
                "phone": "+91 99999 77777",
                "designation": role,
                "department": "Executive Office",
                "status": "Active"
            }).execute()
            print("Fallback direct insert into public.employees succeeded.")
        except Exception as e2:
            print(f"All database sync attempts failed: {e2}")

if __name__ == "__main__":
    seed_sample_ceo()
