import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.supabase import get_supabase_admin_client

def test_columns():
    client = get_supabase_admin_client()
    if not client:
        print("Failed to initialize client")
        return

    test_payload = {
        "employment_type": "Full-time",
        "work_mode": "In Office",
        "work_location": "Chennai",
        "marital_status": "Single",
        "blood_group": "O+",
        "pan_id": "ABCDE1234F",
        "personal_email": "test@email.com",
        "alternate_contact": "+91 99999 88888",
        "current_address": "Test Current Address",
        "permanent_address": "Test Permanent Address",
        "primary_skills": "Python, React",
        "secondary_skills": "FastAPI",
        "tools": "VS Code",
        "emergency_name": "Kin Name",
        "emergency_relationship": "Kin",
        "emergency_contact": "+91 99999 77777",
        "account_holder": "Test Holder",
        "bank_name": "Test Bank",
        "account_number": "1234567890",
        "ifsc": "IFSC0001",
        "branch": "Test Branch"
    }

    print("Attempting update with extended profile fields...")
    for field, val in test_payload.items():
        try:
            res = client.schema("hrms").table("employees").update({field: val}).eq("email", "executive@tconnect.com").execute()
            print(f"  [PASS] Column '{field}' exists.")
        except Exception as e:
            err_msg = str(e)
            if "does not exist" in err_msg or "PGRST204" in err_msg or "not found" in err_msg:
                print(f"  [FAIL] Column '{field}' DOES NOT EXIST in database. Error: {err_msg}")
            else:
                print(f"  [NOTICE] Column '{field}' check resulted in unexpected error: {err_msg}")

if __name__ == "__main__":
    test_columns()
