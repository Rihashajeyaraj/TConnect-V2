import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath("."))

def run_tests():
    print("==================================================")
    print("TESTING SALES MANAGER - EXECUTIVE ASSIGNMENT & SCOPING")
    print("==================================================\n")

    from app.modules.users.repository import UserRepository
    from app.modules.users.service import UserService
    from app.modules.users.schemas import AssignManagerRequest
    from app.core.scoping import get_allowed_user_identifiers, is_record_accessible
    from app.modules.crm.repository import CRMRepository
    from app.modules.expense.repository import ExpenseRepository

    user_repo = UserRepository()
    user_service = UserService()

    # 1. Fetch available users
    all_users = user_repo.get_all_users()
    managers = [u for u in all_users if "manager" in str(u.get("role")).lower() or "admin" in str(u.get("role")).lower()]
    executives = [u for u in all_users if "executive" in str(u.get("role")).lower()]

    assert len(managers) > 0, "Expected at least 1 Sales Manager in system"
    assert len(executives) >= 2, "Expected at least 2 Sales Executives in system"

    manager = managers[0]
    m_id = manager["id"]
    m_name = manager["name"]
    exec1 = executives[0]
    exec2 = executives[1]

    print(f"[Selected Manager] {m_name} (ID: {m_id})")
    print(f"[Assigning Executives] {exec1['name']} ({exec1['email']}), {exec2['name']} ({exec2['email']})")

    # 2. Perform Assignment via UserService
    req = AssignManagerRequest(manager_id=m_id, executive_ids=[exec1["id"], exec2["id"]])
    assign_res = user_service.assign_sales_executives(req)

    assert assign_res["count"] == 2, f"Expected 2 assigned executives, got {assign_res['count']}"
    print("[PASS] Assignment API successfully executed and assigned 2 executives.")

    # 3. Verify Reporting Manager persisted in User Repository
    assigned_execs = user_service.get_assigned_executives_for_manager(m_id)
    assigned_ids = [e["id"] for e in assigned_execs]
    assert exec1["id"] in assigned_ids, "Executive 1 not found in assigned list"
    assert exec2["id"] in assigned_ids, "Executive 2 not found in assigned list"
    print("[PASS] Reporting Manager persisted in User Records.")

    # 4. Verify Scoping Engine for Sales Manager
    manager_payload = {
        "sub": m_id,
        "user_id": m_id,
        "email": manager["email"],
        "role": manager["role"],
        "employee_code": manager.get("employee_code", "EMP001"),
        "name": m_name
    }

    allowed_mgr = get_allowed_user_identifiers(manager_payload)
    assert allowed_mgr is not None, "Manager allowed scope should not be None"
    assert exec1["email"].lower() in allowed_mgr["emails"], "Executive 1 email should be in manager's allowed scope"
    assert exec2["email"].lower() in allowed_mgr["emails"], "Executive 2 email should be in manager's allowed scope"
    print(f"[PASS] Scoping Engine correctly resolved allowed team emails: {allowed_mgr['emails']}")

    # 5. Verify Scoping Engine for Sales Executive
    exec_payload = {
        "sub": exec1["id"],
        "user_id": exec1["id"],
        "email": exec1["email"],
        "role": exec1["role"],
        "employee_code": exec1.get("employee_code", "EMP002"),
        "name": exec1["name"]
    }
    allowed_exec = get_allowed_user_identifiers(exec_payload)
    assert allowed_exec is not None, "Executive scope should not be None"
    assert exec1["email"].lower() in allowed_exec["emails"], "Executive's own email must be allowed"
    assert exec2["email"].lower() not in allowed_exec["emails"], "Other Executive's email MUST NOT be allowed for SE"
    print("[PASS] Sales Executive scope restricted ONLY to their own credentials.")

    # 6. Verify Scoping Engine for Admin
    admin_payload = {"role": "Super Admin", "email": "admin@tconnect.com"}
    allowed_admin = get_allowed_user_identifiers(admin_payload)
    assert allowed_admin is None, "Admin scope must be None (unrestricted)"
    print("[PASS] Admin scope is unrestricted (None).")

    # 7. Record Accessibility Check
    rec_exec1 = {"assigned_to_email": exec1["email"], "customer_name": "Acme Corp"}
    rec_exec2 = {"assigned_to_email": exec2["email"], "customer_name": "Beta LLC"}
    rec_unassigned = {"assigned_to_email": "other_unassigned_guy@tconnect.com", "customer_name": "Gamma Inc"}

    assert is_record_accessible(rec_exec1, allowed_mgr) == True, "Manager should access Exec 1 record"
    assert is_record_accessible(rec_exec2, allowed_mgr) == True, "Manager should access Exec 2 record"
    assert is_record_accessible(rec_exec1, allowed_exec) == True, "Exec 1 should access Exec 1 record"
    assert is_record_accessible(rec_exec2, allowed_exec) == False, "Exec 1 MUST NOT access Exec 2 record"

    print("[PASS] Record-level data isolation verified across Manager, Executive, and Admin scopes.")

    print("\n==================================================")
    print("ALL SALES MANAGER - EXECUTIVE ASSIGNMENT TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
