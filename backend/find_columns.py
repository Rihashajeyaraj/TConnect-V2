import sys
import os
sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client

admin = get_supabase_admin_client()

print("--- TESTING COLUMN SELECT ON EMPLOYEES TABLE ---")
test_cols = [
    "id", "employee_id", "user_id", "employee_code", "first_name", "last_name", 
    "full_name", "name", "email", "phone", "mobile", "mobile_number", 
    "role", "designation", "department", "department_id", "status", "is_active", "created_at"
]

valid_cols = []
for c in test_cols:
    try:
        res = admin.table("employees").select(c).limit(1).execute()
        print(f"[EXISTS] Column '{c}' exists in table 'employees'")
        valid_cols.append(c)
    except Exception as e:
        err = str(e)
        if "PGRST204" in err or "Could not find" in err:
            pass
        else:
            print(f"[ERROR] Column '{c}': {err}")

print("\nVALID COLUMNS IN EMPLOYEES TABLE:", valid_cols)
