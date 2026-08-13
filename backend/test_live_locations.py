import sys
import os
import datetime

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath("."))

from app.modules.auth.service import AuthService
from app.modules.auth.schemas import LoginRequest
from app.modules.users.repository import UserRepository
from app.modules.users.service import UserService
from app.modules.users.schemas import AssignManagerRequest
from app.database.supabase import get_supabase_admin_client, get_supabase_client
from app.modules.spatial.routes import update_executive_location, get_manager_team_locations
from fastapi import HTTPException

async def run_tests():
    print("==================================================")
    print("RUNNING LIVE LOCATION SCOPING & ASSIGNMENT TESTS")
    print("==================================================\n")

    auth_service = AuthService()
    user_repo = UserRepository()
    user_service = UserService()
    sp_client = get_supabase_admin_client() or get_supabase_client()

    # Verify that hrms.employee_locations table exists
    try:
        sp_client.schema("hrms").table("employee_locations").select("*").limit(1).execute()
    except Exception as e:
        err_msg = str(e)
        if "PGRST205" in err_msg or "relation" in err_msg.lower():
            print("[CRITICAL ERROR] The table 'hrms.employee_locations' does not exist in Supabase.")
            print("Please run the migration script 'live_locations_schema.sql' in your Supabase SQL Editor first!")
            sys.exit(1)

    # 1. Fetch Sales Managers and Executives
    all_users = user_repo.get_all_users()
    managers = [u for u in all_users if "manager" in str(u.get("role")).lower()]
    executives = [u for u in all_users if "executive" in str(u.get("role")).lower()]

    if len(managers) < 2:
        print("[SKIP] Need at least 2 Sales Managers to run isolation tests.")
        return
    if len(executives) < 1:
        print("[SKIP] Need at least 1 Sales Executive to run location tests.")
        return

    mgr_a = managers[0]
    mgr_b = managers[1]
    exec_user = executives[0]

    print(f"Manager A: {mgr_a['name']} ({mgr_a['email']})")
    print(f"Manager B: {mgr_b['name']} ({mgr_b['email']})")
    print(f"Executive: {exec_user['name']} ({exec_user['email']})")

    # ── Step 2: Assign Executive to Manager A ────────────────────────────────
    print(f"\n[STEP 2] Assigning {exec_user['name']} to Manager A ({mgr_a['name']})...")
    assign_req = AssignManagerRequest(manager_id=mgr_a["id"], executive_ids=[exec_user["id"]])
    user_service.assign_sales_executives(assign_req)

    # ── Step 3: Simulate Executive Location Update ───────────────────────────
    print(f"\n[STEP 3] Updating live location for Executive {exec_user['name']}...")
    exec_payload = {
        "sub": exec_user["id"],
        "email": exec_user["email"],
        "role": exec_user["role"],
        "user_metadata": {
            "role": exec_user["role"],
            "full_name": exec_user["name"],
            "employee_code": exec_user.get("employee_code", "EMP-TEST")
        }
    }
    
    update_payload = {
        "latitude": 13.0067,
        "longitude": 80.2570,
        "accuracy": 15.5
    }
    
    res = await update_executive_location(update_payload, exec_payload)
    assert res["success"] is True, "Failed to update location"
    print("SUCCESS: Executive location updated and persisted successfully.")

    # ── Step 4: Verify Manager A can see the location ────────────────────────
    print(f"\n[STEP 4] Fetching team locations as Manager A...")
    mgr_a_payload = {
        "sub": mgr_a["id"],
        "email": mgr_a["email"],
        "role": mgr_a["role"],
        "user_metadata": {
            "role": mgr_a["role"],
            "full_name": mgr_a["name"]
        }
    }
    
    res_a = await get_manager_team_locations(mgr_a_payload)
    assert res_a["success"] is True
    print(f"Manager A team size: {res_a['team_count']}")
    
    matched_ex_a = next((ex for ex in res_a["executives"] if ex["employee_id"] == exec_user["id"]), None)
    assert matched_ex_a is not None, "Manager A should be able to see the assigned executive"
    assert matched_ex_a["latitude"] == 13.0067, "Location latitude mismatch"
    assert matched_ex_a["longitude"] == 80.2570, "Location longitude mismatch"
    print("SUCCESS: Manager A successfully retrieved assigned team's correct GPS coordinates.")

    # ── Step 5: Verify Manager B CANNOT see the location ─────────────────────
    print(f"\n[STEP 5] Fetching team locations as Manager B...")
    mgr_b_payload = {
        "sub": mgr_b["id"],
        "email": mgr_b["email"],
        "role": mgr_b["role"],
        "user_metadata": {
            "role": mgr_b["role"],
            "full_name": mgr_b["name"]
        }
    }
    
    res_b = await get_manager_team_locations(mgr_b_payload)
    assert res_b["success"] is True
    matched_ex_b = next((ex for ex in res_b["executives"] if ex["employee_id"] == exec_user["id"]), None)
    assert matched_ex_b is None, "Manager B MUST NOT see Manager A's executive locations!"
    print("SUCCESS: Team location isolation holds: Manager B did not receive Manager A's executive coordinates.")

    # ── Step 6: Reassign Executive to Manager B ──────────────────────────────
    print(f"\n[STEP 6] Reassigning {exec_user['name']} to Manager B ({mgr_b['name']})...")
    unassign_req = AssignManagerRequest(manager_id=mgr_a["id"], executive_ids=[])
    user_service.assign_sales_executives(unassign_req)
    
    reassign_req = AssignManagerRequest(manager_id=mgr_b["id"], executive_ids=[exec_user["id"]])
    user_service.assign_sales_executives(reassign_req)

    # ── Step 7: Verify Access Shifted ───────────────────────────────────────
    print(f"\n[STEP 7] Re-verifying map scoping after reassignment...")
    res_a_after = await get_manager_team_locations(mgr_a_payload)
    matched_ex_a_after = next((ex for ex in res_a_after["executives"] if ex["employee_id"] == exec_user["id"]), None)
    assert matched_ex_a_after is None, "Manager A should no longer have access to reassigned executive's location"
    
    res_b_after = await get_manager_team_locations(mgr_b_payload)
    matched_ex_b_after = next((ex for ex in res_b_after["executives"] if ex["employee_id"] == exec_user["id"]), None)
    assert matched_ex_b_after is not None, "Manager B should now have access to the reassigned executive's location"
    assert matched_ex_b_after["latitude"] == 13.0067, "Location latitude mismatch on new manager"
    print("SUCCESS: Map access shifted dynamically: Manager B has access, Manager A has lost access.")

    print("\n==================================================")
    print("ALL LIVE LOCATION SCOPING & ISOLATION TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_tests())
