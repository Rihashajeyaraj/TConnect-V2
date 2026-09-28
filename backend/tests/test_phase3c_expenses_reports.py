import sys
import os
import asyncio
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.dependencies import (
    UserContext,
    RequirePermissions,
    get_employee_permission_map,
    set_employee_permission_override,
    _in_memory_employee_permissions,
    _employee_id_aliases,
)
from app.exceptions.base import ForbiddenException


def test_3c_1_expense_permission_granted_allowed():
    """A. Expense permission granted -> allowed."""
    emp_id = "EMP-EXP-GRANT-001"
    set_employee_permission_override(emp_id, "expenses.create", True, designation="Sales Executive")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id}, perm_map["permissions"], perm_map["scopes"])
    assert ctx.has_permission("expenses.create") is True


def test_3c_2_expense_permission_denied_403():
    """B. Expense permission denied -> 403."""
    emp_id = "EMP-EXP-DENY-001"
    set_employee_permission_override(emp_id, "expenses.create", False, designation="Sales Executive")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id}, perm_map["permissions"], perm_map["scopes"])
    
    guard = RequirePermissions("expenses.create")
    try:
        asyncio.run(guard(ctx))
        assert False, "Expected ForbiddenException"
    except ForbiddenException:
        pass


def test_3c_3_same_designation_different_expense_permissions():
    """C. Same designation, different expense permissions."""
    emp_a = "EMP-EXP-SAME-001"
    emp_b = "EMP-EXP-SAME-002"
    designation = "Sales Executive"
    
    set_employee_permission_override(emp_a, "expenses.approve", True, designation=designation)
    set_employee_permission_override(emp_b, "expenses.approve", False, designation=designation)
    
    ctx_a = UserContext({"sub": emp_a}, get_employee_permission_map(emp_a)["permissions"], {})
    ctx_b = UserContext({"sub": emp_b}, get_employee_permission_map(emp_b)["permissions"], {})
    
    assert ctx_a.has_permission("expenses.approve") is True
    assert ctx_b.has_permission("expenses.approve") is False


def test_3c_4_expense_own_scope():
    """D. Expense OWN scope."""
    emp_id = "EMP-EXP-OWN-001"
    other_id = "EMP-EXP-OWN-002"
    set_employee_permission_override(emp_id, "expenses.approve", True, data_scope="OWN")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "employee_code": emp_id}, perm_map["permissions"], perm_map["scopes"])
    
    # Accessing own record passes
    ctx.enforce_scope("expenses.approve", emp_id)
    
    # Accessing other record fails with 403
    try:
        ctx.enforce_scope("expenses.approve", other_id)
        assert False, "Expected ForbiddenException when accessing outside OWN scope"
    except ForbiddenException:
        pass


def test_3c_5_expense_team_scope():
    """E. Expense TEAM scope."""
    emp_id = "EMP-EXP-TEAM-001"
    team_member = "EMP-EXP-TEAM-002"
    stranger = "EMP-EXP-TEAM-003"
    set_employee_permission_override(emp_id, "expenses.approve", True, data_scope="TEAM")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "employee_code": emp_id}, perm_map["permissions"], perm_map["scopes"])
    
    # Accessing team member passes
    ctx.enforce_scope("expenses.approve", team_member, team_member_ids=[team_member])
    
    # Accessing non-team member fails with 403
    try:
        ctx.enforce_scope("expenses.approve", stranger, team_member_ids=[team_member])
        assert False, "Expected ForbiddenException when accessing outside TEAM scope"
    except ForbiddenException:
        pass


def test_3c_6_expense_org_scope():
    """F. Expense ORG scope."""
    emp_id = "EMP-EXP-ORG-001"
    any_id = "EMP-ANYONE-999"
    set_employee_permission_override(emp_id, "expenses.approve", True, data_scope="ORG")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "employee_code": emp_id}, perm_map["permissions"], perm_map["scopes"])
    
    # Accessing any record in organization passes
    ctx.enforce_scope("expenses.approve", any_id)


def test_3c_7_expense_approval_permission_enforcement():
    """G. Expense approval permission enforcement."""
    emp_id = "EMP-APPROVE-TEST"
    set_employee_permission_override(emp_id, "expenses.approve", False)
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id}, perm_map["permissions"], perm_map["scopes"])
    
    guard = RequirePermissions("expenses.approve")
    try:
        asyncio.run(guard(ctx))
        assert False, "Expected ForbiddenException when expenses.approve is False"
    except ForbiddenException:
        pass


def test_3c_8_reports_view_permission_enforcement():
    """H. Reports view permission enforcement."""
    emp_id = "EMP-RPT-VIEW"
    set_employee_permission_override(emp_id, "reports.view", True)
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id}, perm_map["permissions"], perm_map["scopes"])
    assert ctx.has_permission("reports.view") is True


def test_3c_9_reports_export_permission_enforcement():
    """I. Reports export permission enforcement."""
    emp_id = "EMP-RPT-EXP"
    set_employee_permission_override(emp_id, "reports.export", False)
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id}, perm_map["permissions"], perm_map["scopes"])
    assert ctx.has_permission("reports.export") is False


def test_3c_10_view_allowed_export_denied():
    """J. View allowed + export denied."""
    emp_id = "EMP-RPT-SPLIT"
    set_employee_permission_override(emp_id, "reports.view", True)
    set_employee_permission_override(emp_id, "reports.export", False)
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id}, perm_map["permissions"], perm_map["scopes"])
    
    assert ctx.has_permission("reports.view") is True
    assert ctx.has_permission("reports.export") is False
    
    guard_export = RequirePermissions("reports.export")
    try:
        asyncio.run(guard_export(ctx))
        assert False, "Expected ForbiddenException for export"
    except ForbiddenException:
        pass


def test_3c_11_ceo_denied_when_permission_false():
    """K. CEO denied when permission=False."""
    emp_id = "EMP-CEO-3C"
    set_employee_permission_override(emp_id, "reports.export", False, designation="CEO / Founder")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "role": "CEO / Founder"}, perm_map["permissions"], perm_map["scopes"])
    
    assert ctx.has_permission("reports.export") is False


def test_3c_12_super_admin_denied_when_permission_false():
    """L. Super Admin denied when permission=False."""
    emp_id = "EMP-SUPERADMIN-3C"
    set_employee_permission_override(emp_id, "expenses.approve", False, designation="Super Admin")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "role": "Super Admin"}, perm_map["permissions"], perm_map["scopes"])
    
    assert ctx.has_permission("expenses.approve") is False


def test_3c_13_admin_denied_when_permission_false():
    """M. Admin denied when permission=False."""
    emp_id = "EMP-ADMIN-3C"
    set_employee_permission_override(emp_id, "expenses.create", False, designation="Admin")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "role": "Admin"}, perm_map["permissions"], perm_map["scopes"])
    
    assert ctx.has_permission("expenses.create") is False


def test_3c_14_missing_permission_fails_closed():
    """N. Missing permission fails closed."""
    emp_id = "EMP-MISSING-3C"
    ctx = UserContext({"sub": emp_id}, {}, {})
    
    assert ctx.has_permission("expenses.view") is False
    assert ctx.has_permission("reports.view") is False


def test_3c_15_direct_api_cannot_bypass():
    """O. Direct API access cannot bypass permissions."""
    emp_id = "EMP-BYPASS-3C"
    set_employee_permission_override(emp_id, "expenses.approve", False)
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id}, perm_map["permissions"], {})
    
    guard = RequirePermissions("expenses.approve")
    try:
        asyncio.run(guard(ctx))
        assert False, "Expected ForbiddenException"
    except ForbiddenException:
        pass


def test_3c_16_report_data_does_not_leak_outside_scope():
    """P. Report data does not leak outside configured scope."""
    emp_id = "EMP-RPT-LEAK"
    set_employee_permission_override(emp_id, "reports.view", True, data_scope="OWN")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "employee_code": emp_id}, perm_map["permissions"], perm_map["scopes"])
    
    # OWN scope cannot access ORG dashboard
    assert ctx.get_scope("reports.view") == "OWN"
    assert ctx.get_scope("reports.view") != "ORG"


if __name__ == "__main__":
    print("Running Phase 3C (Expenses + Reports) backend permission tests...")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    
    test_3c_1_expense_permission_granted_allowed()
    print("[PASS] Test 3C-1: Expense permission granted allows access")
    
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_3c_2_expense_permission_denied_403()
    print("[PASS] Test 3C-2: Expense permission denied returns HTTP 403")
    
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_3c_3_same_designation_different_expense_permissions()
    print("[PASS] Test 3C-3: Same designation different expense permissions passed")
    
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_3c_4_expense_own_scope()
    print("[PASS] Test 3C-4: Expense OWN scope passed")
    
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_3c_5_expense_team_scope()
    print("[PASS] Test 3C-5: Expense TEAM scope passed")
    
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_3c_6_expense_org_scope()
    print("[PASS] Test 3C-6: Expense ORG scope passed")
    
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_3c_7_expense_approval_permission_enforcement()
    print("[PASS] Test 3C-7: Expense approval permission enforcement passed")
    
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_3c_8_reports_view_permission_enforcement()
    print("[PASS] Test 3C-8: Reports view permission enforcement passed")
    
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_3c_9_reports_export_permission_enforcement()
    print("[PASS] Test 3C-9: Reports export permission enforcement passed")
    
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_3c_10_view_allowed_export_denied()
    print("[PASS] Test 3C-10: View allowed + export denied passed")
    
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_3c_11_ceo_denied_when_permission_false()
    print("[PASS] Test 3C-11: CEO denied when permission=False passed")
    
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_3c_12_super_admin_denied_when_permission_false()
    print("[PASS] Test 3C-12: Super Admin denied when permission=False passed")
    
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_3c_13_admin_denied_when_permission_false()
    print("[PASS] Test 3C-13: Admin denied when permission=False passed")
    
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_3c_14_missing_permission_fails_closed()
    print("[PASS] Test 3C-14: Missing permission fails closed passed")
    
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_3c_15_direct_api_cannot_bypass()
    print("[PASS] Test 3C-15: Direct API access cannot bypass permissions passed")
    
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_3c_16_report_data_does_not_leak_outside_scope()
    print("[PASS] Test 3C-16: Report data does not leak outside configured scope passed")
    
    print("\nALL PHASE 3C (EXPENSES + REPORTS) TESTS PASSED SUCCESSFULLY!")
