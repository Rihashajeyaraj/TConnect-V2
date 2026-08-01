import sys
import os
sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client

admin = get_supabase_admin_client()

print("--- TESTING CLEAN INSERT IN PUBLIC.EMPLOYEES ---")

payloads = [
    {
        "id": "emp_test_999",
        "name": "Test User Clean",
        "email": "test.clean.999@tconnect.com",
        "phone": "+91 99887 76655",
        "role": "Sales Executive",
        "status": "Active"
    },
    {
        "name": "Test User Clean 2",
        "email": "test.clean.888@tconnect.com",
        "phone": "+91 99887 76644",
        "role": "Sales Executive",
        "status": "Active"
    }
]

for i, p in enumerate(payloads):
    try:
        res = admin.table("employees").insert(p).execute()
        print(f"✅ SUCCESS INSERT Payload {i+1}:", res.data)
        break
    except Exception as e:
        print(f"❌ FAILED INSERT Payload {i+1}:", e)
