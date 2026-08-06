import sys
import os
import uuid

sys.path.insert(0, os.path.abspath("."))

from app.database.supabase import get_supabase_admin_client, get_supabase_client

def test_uuid_assigned_to():
    supabase = get_supabase_admin_client() or get_supabase_client()
    print("Testing Lead insert with valid UUID or None for assigned_to...")

    lead_id = str(uuid.uuid4())
    lead_payload = {
        "lead_id": lead_id,
        "lead_number": f"LD-{uuid.uuid4().hex[:6].upper()}",
        "company_name": "Test UUID Lead Co",
        "contact_person": "Jane Doe",
        "mobile": "+91 98765 43210",
        "email": "jane@uuidtest.com",
        "city": "Chennai",
        "assigned_to": None, # None because assigned_to is UUID column!
        "notes": "Assigned to: Sales Executive (executive@tconnect.com)",
        "is_active": True
    }

    try:
        res = supabase.table("leads").insert(lead_payload).execute()
        print("SUCCESS! Saved lead in public.leads:", res.data)
    except Exception as e:
        print("FAILED:", e)

if __name__ == "__main__":
    test_uuid_assigned_to()
