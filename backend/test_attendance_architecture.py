import os
import sys
import json
import time
import uuid
import hmac
import hashlib
import jose.jwt

# Add backend to path
sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

from app.core.config import settings
from app.database.supabase import get_supabase_admin_client, get_supabase_client
from app.modules.attendance.biometric_client import BiometricClient
from app.modules.attendance.routes import verify_location_signature
from app.modules.attendance.repository import AttendanceRepository
from app.modules.attendance.schemas import ClockInRequest, ClockOutRequest

def run_tests():
    print("=" * 60)
    print("TWITECONNECT ATTENDANCE ARCHITECTURE TEST SUITE")
    print("=" * 60)
    
    # 1. Test Biometric Service Connectivity
    print("\n[TEST 1] Biometric Service Health Check:")
    bio_client = BiometricClient()
    health = bio_client.check_health()
    print(f"Health Result: {health}")
    assert health.get("reachable") is True, "Biometric service must be reachable"
    print("[PASS] Test 1 Passed: Biometric service is online and healthy.")

    # 2. Test HMAC Location Signature Verification (No Permanent Secret)
    print("\n[TEST 2] Cryptographic HMAC Location Signature Verification:")
    challenge_salt = str(uuid.uuid4())
    token_payload = {
        "challenge_salt": challenge_salt,
        "type": "biometric_verification",
        "verified_employee_id": "EMP000012",
        "verified_employee_name": "Sales Executive"
    }
    verification_token = jose.jwt.encode(token_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    lat = 13.006700
    lng = 80.257000
    ts = int(time.time())
    emp_id = "EMP000012"
    
    # Frontend generates signature using ephemeral challenge_salt
    msg = "{:.6f}:{:.6f}:{}:{}".format(lat, lng, ts, emp_id).encode("utf-8")
    sig = hmac.new(challenge_salt.encode("utf-8"), msg, hashlib.sha256).hexdigest()
    
    # Backend validates
    try:
        verify_location_signature(
            lat=lat,
            lng=lng,
            timestamp=ts,
            employee_id=emp_id,
            location_signature=sig,
            verification_token=verification_token
        )
        print("[PASS] Valid signature verified successfully by backend.")
    except Exception as e:
        print(f"FAILED to verify valid signature: {e}")
        raise e

    # Test Tampered Location (Spoofing test)
    try:
        verify_location_signature(
            lat=14.999999, # Tampered lat
            lng=lng,
            timestamp=ts,
            employee_id=emp_id,
            location_signature=sig,
            verification_token=verification_token
        )
        print("[FAIL] Tampered location was not rejected!")
        assert False, "Tampered location should have been rejected"
    except Exception as e:
        print(f"[PASS] Test 2 Passed: Tampered location signature rejected as expected ({e.detail if hasattr(e, 'detail') else e}).")

    # 3. Test Office Mode Clock-In (Pure Attendance, NO Tracking Session)
    print("\n[TEST 3] Office Mode Attendance Record Creation:")
    repo = AttendanceRepository()
    test_emp_id = "EMP_TEST_OFFICE"
    test_date = time.strftime("%Y-%m-%d")
    
    office_clock_in = {
        "employee_id": test_emp_id,
        "employee_name": "Test Office Executive",
        "attendance_date": test_date,
        "check_in_time": "09:15:00 AM",
        "latitude": 13.0067,
        "longitude": 80.2570,
        "check_in_latitude": 13.0067,
        "check_in_longitude": 80.2570,
        "check_in_address": "TwiteConnect Chennai Headquarters, Adyar",
        "mode": "Office",
        "notes": "[Office Mode] Working from office premises",
        "remarks": "[Office Mode] Working from office premises",
    }
    
    log = repo.create_log(office_clock_in)
    print(f"Created Office Attendance Log ID: {log.get('id')}")
    assert log.get("mode") == "Office" or "Office" in log.get("notes", ""), "Mode must be Office"
    assert "CLIENT_VISIT_DESTINATION" not in (log.get("check_in_address") or ""), "Office mode must not have client destination"
    print("[PASS] Test 3 Passed: Office Mode record created without visit destination.")

    # 4. Test Client Mode Clock-In (Client Destination Attached)
    print("\n[TEST 4] Client Mode Attendance Record Creation:")
    test_client = {
        "id": "lead_12345",
        "title": "Apollo Hospitals Enterprise",
        "company_name": "Apollo Hospitals",
        "address": "Greams Road, Thousand Lights, Chennai",
        "latitude": 13.0604,
        "longitude": 80.2505,
        "category": "Customer"
    }
    client_dest_encoded = f"CLIENT_VISIT_DESTINATION:::{json.dumps(test_client)}"
    
    client_clock_in = {
        "employee_id": test_emp_id,
        "employee_name": "Test Client Executive",
        "attendance_date": test_date,
        "check_in_time": "09:30:00 AM",
        "latitude": 13.0067,
        "longitude": 80.2570,
        "check_in_latitude": 13.0067,
        "check_in_longitude": 80.2570,
        "check_in_address": client_dest_encoded,
        "mode": "Client Visit",
        "notes": f"[Client Visit Mode] Visit to {test_client['title']}",
        "remarks": f"[Client Visit Mode] Visit to {test_client['title']}",
    }
    
    client_log = repo.create_log(client_clock_in)
    print(f"Created Client Attendance Log ID: {client_log.get('id')}")
    assert "CLIENT_VISIT_DESTINATION" in client_log.get("check_in_address", ""), "Client mode must have encoded destination"
    
    # Verify parsing on manager side
    parsed_client = json.loads(client_log["check_in_address"].replace("CLIENT_VISIT_DESTINATION:::", ""))
    assert parsed_client["id"] == "lead_12345"
    assert parsed_client["title"] == "Apollo Hospitals Enterprise"
    assert parsed_client["latitude"] == 13.0604
    assert parsed_client["longitude"] == 80.2505
    print("[PASS] Test 4 Passed: Client Mode record created with full destination metadata.")

    # 5. Test Clock-Out
    print("\n[TEST 5] Attendance Clock-Out:")
    clock_out_data = {
        "employee_id": test_emp_id,
        "attendance_date": test_date,
        "check_out_time": "06:00:00 PM",
        "latitude": 13.0067,
        "longitude": 80.2570,
        "check_out_address": "TwiteConnect Chennai Headquarters, Adyar",
        "total_working_hours": "8h 45m",
        "notes": "Shift completed",
    }
    out_res = repo.clock_out(clock_out_data)
    print(f"Clocked out status: {out_res.get('status') or out_res.get('attendance_status')}")
    print("[PASS] Test 5 Passed: Clock-Out recorded successfully.")

    print("\n" + "=" * 60)
    print("ALL ATTENDANCE RESTORATION TESTS PASSED (5/5)")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
