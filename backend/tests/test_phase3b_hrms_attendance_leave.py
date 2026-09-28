import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import asyncio
from app.core.dependencies import (
    UserContext,
    RequirePermissions,
    set_employee_permission_override,
    _in_memory_employee_permissions,
)
from app.exceptions.base import ForbiddenException


def test_3b_hrms_permission_granted():
    """A. Permission granted allows access."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-P3B-001"
    set_employee_permission_override(emp_id, "hrms.employees.view", True, designation="Sales Executive")
    
    perm_map = _in_memory_employee_permissions[emp_id]
    context = UserContext({"sub": emp_id, "role": "Sales Executive"}, perm_map["permissions"], perm_map["scopes"])
    
    guard = RequirePermissions("hrms.employees.view")
    res = asyncio.run(guard(context))
    assert res.employee_id == emp_id


def test_3b_permission_denied_403():
    """B. Permission denied returns HTTP 403 (ForbiddenException)."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-P3B-002"
    set_employee_permission_override(emp_id, "hrms.employees.create", False, designation="Sales Executive")
    
    perm_map = _in_memory_employee_permissions[emp_id]
    context = UserContext({"sub": emp_id, "role": "Sales Executive"}, perm_map["permissions"], perm_map["scopes"])
    
    guard = RequirePermissions("hrms.employees.create")
    try:
        asyncio.run(guard(context))
        assert False, "Expected ForbiddenException"
    except ForbiddenException as e:
        assert "Permission denied" in str(e) or "403" in str(e)


def test_3b_privileged_roles_blocked_when_permission_false():
    """C, D, E. CEO, Super Admin, and Admin are denied HTTP 403 if permission is False."""
    _in_memory_employee_permissions.clear()
    roles = [
        ("EMP-CEO-3B", "CEO / Founder", "hrms.salaries.edit"),
        ("EMP-SA-3B", "Super Admin", "hrms.employees.status"),
        ("EMP-ADMIN-3B", "Admin", "hrms.leaves.approve_team"),
    ]
    
    for emp_id, designation, perm_key in roles:
        set_employee_permission_override(emp_id, perm_key, False, designation=designation)
        ctx = UserContext({"sub": emp_id, "role": designation}, _in_memory_employee_permissions[emp_id]["permissions"], {})
        guard = RequirePermissions(perm_key)
        try:
            asyncio.run(guard(ctx))
            assert False, f"Expected ForbiddenException for {designation} on {perm_key}"
        except ForbiddenException:
            pass


def test_3b_same_designation_different_permissions():
    """F. Same designation: Exec A allowed, Exec B denied."""
    _in_memory_employee_permissions.clear()
    emp_a = "EMP-P3B-EXEC-A"
    emp_b = "EMP-P3B-EXEC-B"
    
    set_employee_permission_override(emp_a, "hrms.attendance.mark", True, designation="Sales Executive")
    set_employee_permission_override(emp_b, "hrms.attendance.mark", False, designation="Sales Executive")
    
    ctx_a = UserContext({"sub": emp_a}, _in_memory_employee_permissions[emp_a]["permissions"], {})
    ctx_b = UserContext({"sub": emp_b}, _in_memory_employee_permissions[emp_b]["permissions"], {})
    
    guard = RequirePermissions("hrms.attendance.mark")
    assert asyncio.run(guard(ctx_a)).employee_id == emp_a
    
    try:
        asyncio.run(guard(ctx_b))
        assert False, "Expected ForbiddenException for Exec B"
    except ForbiddenException:
        pass


def test_3b_scopes_own_team_org():
    """G, H, I. Data Scope enforcement for OWN vs TEAM vs ORG."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-P3B-SCOPE-1"
    team_member_id = "EMP-P3B-SCOPE-2"
    stranger_id = "EMP-P3B-STRANGER"
    
    set_employee_permission_override(emp_id, "hrms.employees.view", True, data_scope="OWN", designation="Sales Executive")
    set_employee_permission_override(emp_id, "hrms.employees.edit", True, data_scope="TEAM", designation="Sales Executive")
    set_employee_permission_override(emp_id, "hrms.attendance.approve", True, data_scope="ORG", designation="Sales Executive")
    
    perm_map = _in_memory_employee_permissions[emp_id]
    context = UserContext({"sub": emp_id}, perm_map["permissions"], perm_map["scopes"])
    
    # OWN scope -> accessing stranger fails
    try:
        context.enforce_scope("hrms.employees.view", stranger_id)
        assert False, "Expected ForbiddenException for OWN scope violation"
    except ForbiddenException:
        pass

    # TEAM scope -> accessing team member passes, accessing stranger fails
    context.enforce_scope("hrms.employees.edit", team_member_id, team_member_ids=[team_member_id])
    try:
        context.enforce_scope("hrms.employees.edit", stranger_id, team_member_ids=[team_member_id])
        assert False, "Expected ForbiddenException for TEAM scope violation"
    except ForbiddenException:
        pass

    # ORG scope -> accessing any record passes
    context.enforce_scope("hrms.attendance.approve", stranger_id)


def test_3b_attendance_approval_permission_enforcement():
    """J. Attendance approval permission enforcement."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-P3B-ATTENDANCE-APPROVER"
    
    # Set attendance.approve to False
    set_employee_permission_override(emp_id, "hrms.attendance.approve", False, designation="Sales Manager")
    ctx = UserContext({"sub": emp_id, "role": "Sales Manager"}, _in_memory_employee_permissions[emp_id]["permissions"], {})
    
    guard = RequirePermissions("hrms.attendance.approve")
    try:
        asyncio.run(guard(ctx))
        assert False, "Expected ForbiddenException for Manager without hrms.attendance.approve"
    except ForbiddenException:
        pass


def test_3b_leave_approval_permission_enforcement():
    """K. Leave approval permission enforcement."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-P3B-LEAVE-APPROVER"
    
    # Manager with hrms.leave.approve_team = False
    set_employee_permission_override(emp_id, "hrms.leaves.approve_team", False, designation="Sales Manager")
    ctx = UserContext({"sub": emp_id, "role": "Sales Manager"}, _in_memory_employee_permissions[emp_id]["permissions"], {})
    
    guard = RequirePermissions("hrms.leaves.approve_team")
    try:
        asyncio.run(guard(ctx))
        assert False, "Expected ForbiddenException for Manager without hrms.leaves.approve_team"
    except ForbiddenException:
        pass


def test_3b_unseeded_missing_permission_fail_closed():
    """L, M. Missing permission key fails closed (direct API access attempt)."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-P3B-UNSEEDED"
    
    # Unseeded employee profile -> fail closed returns empty perms
    ctx = UserContext({"sub": emp_id}, {}, {})
    guard = RequirePermissions("hrms.employees.view")
    try:
        asyncio.run(guard(ctx))
        assert False, "Expected ForbiddenException for unseeded user"
    except ForbiddenException:
        pass


if __name__ == "__main__":
    print("Running Phase 3B (HRMS + Attendance + Leave) permission integration tests...")
    test_3b_hrms_permission_granted()
    print("[PASS] Test 3B-1: Permission granted allows access")
    test_3b_permission_denied_403()
    print("[PASS] Test 3B-2: Permission denied returns HTTP 403")
    test_3b_privileged_roles_blocked_when_permission_false()
    print("[PASS] Test 3B-3: CEO, Super Admin, Admin blocked when permission=False")
    test_3b_same_designation_different_permissions()
    print("[PASS] Test 3B-4: Same designation different permissions passed")
    test_3b_scopes_own_team_org()
    print("[PASS] Test 3B-5: OWN, TEAM, ORG scopes passed")
    test_3b_attendance_approval_permission_enforcement()
    print("[PASS] Test 3B-6: Attendance approval permission enforcement passed")
    test_3b_leave_approval_permission_enforcement()
    print("[PASS] Test 3B-7: Leave approval permission enforcement passed")
    test_3b_unseeded_missing_permission_fail_closed()
    print("[PASS] Test 3B-8: Unseeded missing permission fail-closed passed")
    print("\nALL PHASE 3B (HRMS + ATTENDANCE + LEAVE) TESTS PASSED SUCCESSFULLY!")
