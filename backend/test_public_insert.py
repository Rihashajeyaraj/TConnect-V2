import sys
import os
sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client

admin = get_supabase_admin_client()

print("--- TESTING PUBLIC EMPLOYEES INSERT ---")
test_payload = {
    "name": "Test User",
    "email": "test.user.123@tconnect.com",
    "phone": "+91 99887 76655",
    "role": "Sales Executive",
    "department": "Sales",
    "status": "Active"
}

try:
    res = admin.table("employees").insert(test_payload).execute()
    print("SUCCESS INSERT IN PUBLIC.EMPLOYEES:", res.data)
except Exception as e:
    print("FAILED INSERT IN PUBLIC.EMPLOYEES:", e)
