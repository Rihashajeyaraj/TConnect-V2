import sys
import os
sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client

admin = get_supabase_admin_client()

print("--- TESTING INSERT WITH EMPLOYEE_ID ---")

payloads = [
    {
        "name": "Arun Kumar Test",
        "email": "arun.test.100@tconnect.com",
        "phone": "+91 99887 76655",
        "role": "Sales Executive",
        "status": "Active"
    },
    {
        "employee_code": "EMP100",
        "first_name": "Arun",
        "last_name": "Kumar",
        "email": "arun.test.200@tconnect.com",
        "mobile": "+91 99887 76644",
        "status": "Active"
    }
]

for i, p in enumerate(payloads):
    try:
        res = admin.table("employees").insert(p).execute()
        print(f"SUCCESS INSERT Payload {i+1}:", res.data)
    except Exception as e:
        print(f"FAILED INSERT Payload {i+1}:", e)
