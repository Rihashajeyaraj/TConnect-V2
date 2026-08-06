import sys
import os

sys.path.insert(0, os.path.abspath("."))

from app.database.supabase import get_supabase_admin_client, get_supabase_client

def inspect_tables():
    supabase = get_supabase_admin_client() or get_supabase_client()
    print("==================================================")
    print("INSPECTING SUPABASE TABLES & INSERTS")
    print("==================================================\n")

    # Test Lead Insert
    test_lead = {
        "company_name": "Test Acme Ltd",
        "contact_person": "Jane Doe",
        "mobile": "+91 98765 43210",
        "email": "jane@acme.com",
        "city": "Chennai",
        "category": "Hot",
        "priority": "High",
        "expected_value": "450000",
        "status": "New",
        "source": "Field Research (SE)",
        "assigned_to": "Sales Executive",
        "assigned_to_email": "executive@tconnect.com",
        "employee_code": "EMP001",
        "notes": "Test lead insert"
    }

    try:
        res = supabase.table("leads").insert(test_lead).execute()
        print("✓ public.leads insert SUCCESS:", res.data)
    except Exception as e:
        print("❌ public.leads insert FAILED:", e)

    # Test Customer Insert
    test_customer = {
        "company_name": "Test Acme Ltd",
        "contact_person": "Jane Doe",
        "mobile": "+91 98765 43210",
        "email": "jane@acme.com",
        "city": "Chennai",
        "assigned_to": "Sales Executive",
        "assigned_to_email": "executive@tconnect.com",
        "employee_code": "EMP001",
        "billing_address": "Chennai Site",
        "shipping_address": "Chennai Site",
        "notes": "Test customer insert"
    }

    try:
        res = supabase.table("customers").insert(test_customer).execute()
        print("✓ public.customers insert SUCCESS:", res.data)
    except Exception as e:
        print("❌ public.customers insert FAILED:", e)

if __name__ == "__main__":
    inspect_tables()
