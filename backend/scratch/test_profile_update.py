import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.modules.hrms.repository import HRMSRepository

def test_e2e_persistence():
    repo = HRMSRepository()
    test_email = "executive@tconnect.com"
    
    # 1. Fetch current record
    print("Fetching current employee record...")
    orig = repo.get_employee_by_id(test_email)
    if not orig:
        print("FAIL: Could not find test employee 'executive@tconnect.com'!")
        return

    orig_id = orig.get("employee_id") or orig.get("id")
    print(f"Found employee. Code: {orig.get('employee_code')}, ID: {orig_id}")

    # 2. Prepare test payload with all 20 missing columns + profile photo
    test_payload = {
        "employment_type": "Full-time Permanent",
        "work_mode": "Hybrid Office",
        "work_location": "Chennai DLF",
        "marital_status": "Married",
        "blood_group": "A1+ positive",
        "pan_id": "TESTPAN123",
        "personal_email": "personal_exec@test.com",
        "alternate_contact": "+91 99999 55555",
        "current_address": "Chennai Current Rd",
        "permanent_address": "Madurai Permanent Rd",
        "primary_skills": "Sales, Client Handling",
        "secondary_skills": "FastAPI Services",
        "tools": "Git, VS Code",
        "emergency_name": "Emergency Parent",
        "emergency_relationship": "Father",
        "emergency_contact": "+91 99999 44444",
        "account_holder": "Executive Holder",
        "bank_name": "State Bank",
        "account_number": "98765432100",
        "ifsc": "SBIN0009999",
        "branch": "DLF Branch",
        "profile_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    }

    print("Updating profile details in database...")
    try:
        updated = repo.update_employee(test_email, test_payload)
        print("Update call completed successfully.")
    except Exception as e:
        print(f"FAIL: Update call raised exception: {e}")
        return

    # 3. Reload from database
    print("Reloading profile from database...")
    reloaded = repo.get_employee_by_id(test_email)
    if not reloaded:
        print("FAIL: Could not retrieve employee after update!")
        return

    # 4. Assert and compare values
    failed_assertions = []
    for field, expected in test_payload.items():
        val = reloaded.get(field)
        if val != expected:
            failed_assertions.append(f"Field '{field}': Expected '{expected}', Got '{val}'")
            
    if failed_assertions:
        print("PERSISTENCE CHECKS FAILED:")
        for err in failed_assertions:
            print(f"  - {err}")
    else:
        print("SUCCESS: ALL 20 PROFILE FIELDS SUCCESSFULLY PERSISTED AND VERIFIED END-TO-END!")

if __name__ == "__main__":
    test_e2e_persistence()
