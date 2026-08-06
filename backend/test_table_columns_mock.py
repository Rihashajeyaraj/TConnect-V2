import sys
import os
import uuid
from datetime import datetime

sys.path.insert(0, os.path.abspath("."))

from app.database.supabase import get_supabase_admin_client, get_supabase_client

def test_inserts():
    supabase = get_supabase_admin_client() or get_supabase_client()
    print("==================================================")
    print("TESTING MODULE INSERTS IN SUPABASE")
    print("==================================================\n")

    # 1. Test Visit Insert
    print("--- 1. Testing public.visits ---")
    v_id = str(uuid.uuid4())
    v_payload = {
        "visit_id": v_id,
        "employee_id": "EMP-101",
        "employee_name": "Sales Executive",
        "employee_phone": "+91 98765 43210",
        "customer_id": None,
        "customer_name": "Acme Corp",
        "location": "Chennai Site",
        "notes": "Test visit notes",
        "status": "SCHEDULED",
        "visit_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "visit_time": "10:00 AM",
        "created_at": datetime.utcnow().isoformat()
    }
    try:
        res = supabase.table("visits").insert(v_payload).execute()
        print("VISITS INSERT SUCCESS:", res.data)
    except Exception as e:
        print("VISITS INSERT FAILED:", e)

    # 2. Test Notification Insert
    print("\n--- 2. Testing public.notifications ---")
    n_id = str(uuid.uuid4())
    n_payload = {
        "id": n_id,
        "recipient_role": "manager",
        "title": "Test Notification",
        "message": "Test message body",
        "type": "Visit",
        "is_read": False,
        "created_at": datetime.utcnow().isoformat()
    }
    try:
        res = supabase.table("notifications").insert(n_payload).execute()
        print("NOTIFICATIONS INSERT SUCCESS:", res.data)
    except Exception as e:
        print("NOTIFICATIONS INSERT FAILED:", e)

    # 3. Test Attendance Insert
    print("\n--- 3. Testing public.attendance ---")
    a_id = str(uuid.uuid4())
    a_payload = {
        "id": a_id,
        "employee_id": "EMP-101",
        "employee_name": "Sales Executive",
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "status": "Present",
        "punch_in_time": "09:00 AM",
        "created_at": datetime.utcnow().isoformat()
    }
    try:
        res = supabase.table("attendance").insert(a_payload).execute()
        print("ATTENDANCE INSERT SUCCESS:", res.data)
    except Exception as e:
        print("ATTENDANCE INSERT FAILED:", e)

if __name__ == "__main__":
    test_inserts()
