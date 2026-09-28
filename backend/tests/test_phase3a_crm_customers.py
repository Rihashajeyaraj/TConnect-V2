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


def test_3a_crm_permission_granted():
    """1. Permission granted allows access."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-P3A-001"
    set_employee_permission_override(emp_id, "crm.leads.view", True, designation="Sales Executive")
    
    perm_map = _in_memory_employee_permissions[emp_id]
    context = UserContext({"sub": emp_id, "role": "Sales Executive"}, perm_map["permissions"], perm_map["scopes"])
    
    guard = RequirePermissions("crm.leads.view")
    res = asyncio.run(guard(context))
    assert res.employee_id == emp_id


def test_3a_crm_permission_denied_403():
    """2. Permission denied returns HTTP 403 (ForbiddenException)."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-P3A-002"
    set_employee_permission_override(emp_id, "crm.leads.delete", False, designation="Sales Executive")
    
    perm_map = _in_memory_employee_permissions[emp_id]
    context = UserContext({"sub": emp_id, "role": "Sales Executive"}, perm_map["permissions"], perm_map["scopes"])
    
    guard = RequirePermissions("crm.leads.delete")
    try:
        asyncio.run(guard(context))
        assert False, "Expected ForbiddenException"
    except ForbiddenException as e:
        assert "Permission denied" in str(e) or "403" in str(e)


def test_3a_same_designation_different_permission():
    """3. Same designation: Exec A allowed, Exec B denied."""
    _in_memory_employee_permissions.clear()
    emp_a = "EMP-P3A-EXEC-A"
    emp_b = "EMP-P3A-EXEC-B"
    
    set_employee_permission_override(emp_a, "crm.customers.create", True, designation="Sales Executive")
    set_employee_permission_override(emp_b, "crm.customers.create", False, designation="Sales Executive")
    
    ctx_a = UserContext({"sub": emp_a}, _in_memory_employee_permissions[emp_a]["permissions"], {})
    ctx_b = UserContext({"sub": emp_b}, _in_memory_employee_permissions[emp_b]["permissions"], {})
    
    guard = RequirePermissions("crm.customers.create")
    assert asyncio.run(guard(ctx_a)).employee_id == emp_a
    
    try:
        asyncio.run(guard(ctx_b))
        assert False, "Expected ForbiddenException for Exec B"
    except ForbiddenException:
        pass


def test_3a_ceo_superadmin_admin_blocked_when_permission_false():
    """4. CEO, Super Admin, and Admin are denied HTTP 403 if permission is False."""
    _in_memory_employee_permissions.clear()
    roles = [
        ("EMP-CEO-3A", "CEO / Founder", "crm.leads.assign"),
        ("EMP-SA-3A", "Super Admin", "crm.customers.delete"),
        ("EMP-ADMIN-3A", "Admin", "crm.customers.convert"),
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


def test_3a_crm_scope_enforcement():
    """5. Scope enforcement checks OWN vs TEAM vs ORG boundaries."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-P3A-SCOPE-1"
    team_member_id = "EMP-P3A-SCOPE-2"
    stranger_id = "EMP-P3A-STRANGER"
    
    set_employee_permission_override(emp_id, "crm.leads.view", True, data_scope="OWN", designation="Sales Executive")
    set_employee_permission_override(emp_id, "crm.leads.edit", True, data_scope="TEAM", designation="Sales Executive")
    set_employee_permission_override(emp_id, "crm.customers.view", True, data_scope="ORG", designation="Sales Executive")
    
    perm_map = _in_memory_employee_permissions[emp_id]
    context = UserContext({"sub": emp_id}, perm_map["permissions"], perm_map["scopes"])
    
    # OWN scope on leads.view -> accessing stranger fails
    try:
        context.enforce_scope("crm.leads.view", stranger_id)
        assert False, "Expected ForbiddenException for OWN scope violation"
    except ForbiddenException:
        pass

    # TEAM scope on leads.edit -> accessing team member passes, accessing stranger fails
    context.enforce_scope("crm.leads.edit", team_member_id, team_member_ids=[team_member_id])
    try:
        context.enforce_scope("crm.leads.edit", stranger_id, team_member_ids=[team_member_id])
        assert False, "Expected ForbiddenException for TEAM scope violation"
    except ForbiddenException:
        pass

    # ORG scope on customers.view -> accessing any record passes
    context.enforce_scope("crm.customers.view", stranger_id)


if __name__ == "__main__":
    print("Running Phase 3A (CRM + Customers) permission integration tests...")
    test_3a_crm_permission_granted()
    print("[PASS] Test 3A-1: Permission granted allows access")
    test_3a_crm_permission_denied_403()
    print("[PASS] Test 3A-2: Permission denied returns HTTP 403")
    test_3a_same_designation_different_permission()
    print("[PASS] Test 3A-3: Same designation different permission passed")
    test_3a_ceo_superadmin_admin_blocked_when_permission_false()
    print("[PASS] Test 3A-4: CEO, Super Admin, Admin blocked when permission=False")
    test_3a_crm_scope_enforcement()
    print("[PASS] Test 3A-5: Scope enforcement passed")
    print("\nALL PHASE 3A (CRM + CUSTOMERS) TESTS PASSED SUCCESSFULLY!")
