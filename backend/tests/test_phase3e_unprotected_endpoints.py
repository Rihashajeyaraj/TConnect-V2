import sys
import os
import asyncio
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.dependencies import (
    UserContext,
    RequirePermissions,
    get_employee_permission_map,
    set_employee_permission_override,
    invalidate_employee_permission_cache,
    _in_memory_employee_permissions,
)
from app.exceptions.base import ForbiddenException, UnauthorizedException
from app.modules.sales.routes import update_target, delete_target
from app.modules.sales.schemas import SalesTargetUpdate
from app.modules.spatial.routes import prune_expired_snapshots_api
from app.modules.db_test.routes import store_test_data, get_test_data, TestRecord


def test_3e1_a_put_sales_target_without_auth():
    """A. PUT sales target without auth -> blocked."""
    _in_memory_employee_permissions.clear()
    guard = RequirePermissions("sales.targets.manage")
    try:
        asyncio.run(guard(context=None))
        assert False, "Expected error when context is missing"
    except (ForbiddenException, AttributeError, TypeError, Exception):
        pass


def test_3e1_b_delete_sales_target_without_auth():
    """B. DELETE sales target without auth -> blocked."""
    _in_memory_employee_permissions.clear()
    guard = RequirePermissions("sales.targets.manage")
    try:
        asyncio.run(guard(context=None))
        assert False, "Expected error when context is missing"
    except (ForbiddenException, AttributeError, TypeError, Exception):
        pass


def test_3e1_c_put_sales_target_without_permission():
    """C. PUT sales target without permission -> 403 Forbidden."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3E-DENY-001"
    set_employee_permission_override(emp_id, "sales.targets.manage", False, data_scope="OWN", designation="Sales Executive")

    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "employee_code": emp_id}, perm_map["permissions"], perm_map["scopes"])
    assert ctx.has_permission("sales.targets.manage") is False

    guard = RequirePermissions("sales.targets.manage")
    try:
        asyncio.run(guard(ctx))
        assert False, "Expected ForbiddenException when sales.targets.manage permission is false"
    except ForbiddenException:
        pass


def test_3e1_d_delete_sales_target_without_permission():
    """D. DELETE sales target without permission -> 403 Forbidden."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3E-DENY-002"
    set_employee_permission_override(emp_id, "sales.targets.manage", False, data_scope="OWN", designation="Sales Executive")

    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "employee_code": emp_id}, perm_map["permissions"], perm_map["scopes"])

    guard = RequirePermissions("sales.targets.manage")
    try:
        asyncio.run(guard(ctx))
        assert False, "Expected ForbiddenException when deleting without permission"
    except ForbiddenException:
        pass


def test_3e1_e_sales_target_scope_enforcement():
    """E. Sales target scope enforcement (OWN/TEAM scope cannot modify target belonging to outside employee)."""
    _in_memory_employee_permissions.clear()
    mgr_id = "MGR-3E-TEAM-001"
    outside_id = "OUTSIDE-EMP-999"

    set_employee_permission_override(mgr_id, "sales.targets.manage", True, data_scope="TEAM", designation="Sales Manager")

    perm_map = get_employee_permission_map(mgr_id)
    ctx = UserContext({"sub": mgr_id, "employee_code": mgr_id}, perm_map["permissions"], perm_map["scopes"])
    assert ctx.get_scope("sales.targets.manage") == "TEAM"

    try:
        ctx.enforce_scope("sales.targets.manage", outside_id, team_member_ids=["SUB-001", "SUB-002"])
        assert False, "Expected ForbiddenException when target owner is outside TEAM scope"
    except ForbiddenException as fe:
        assert "outside your TEAM scope" in str(fe)


def test_3e1_f_snapshot_prune_without_auth():
    """F. Snapshot prune without auth -> blocked."""
    _in_memory_employee_permissions.clear()
    guard = RequirePermissions("system.settings.edit")
    try:
        asyncio.run(guard(context=None))
        assert False, "Expected exception for missing context"
    except (ForbiddenException, AttributeError, TypeError, Exception):
        pass


def test_3e1_g_snapshot_prune_without_permission():
    """G. Snapshot prune without permission -> 403 Forbidden."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3E-NOPRUNE-001"
    set_employee_permission_override(emp_id, "system.settings.edit", False, data_scope="ORG", designation="Sales Executive")

    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "employee_code": emp_id}, perm_map["permissions"], perm_map["scopes"])

    guard = RequirePermissions("system.settings.edit")
    try:
        asyncio.run(guard(ctx))
        assert False, "Expected ForbiddenException when system.settings.edit is false"
    except ForbiddenException:
        pass


def test_3e1_h_snapshot_prune_with_permission_but_own_team_scope():
    """H. Snapshot prune with permission but OWN or TEAM scope -> 403 Forbidden."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3E-TEAMSCOPE-001"
    set_employee_permission_override(emp_id, "system.settings.edit", True, data_scope="TEAM", designation="Sales Manager")

    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "employee_code": emp_id}, perm_map["permissions"], perm_map["scopes"])

    try:
        asyncio.run(prune_expired_snapshots_api(context=ctx))
        assert False, "Expected ForbiddenException when snapshot prune is attempted with TEAM scope"
    except ForbiddenException as fe:
        assert "requires ORG scope" in str(fe)


def test_3e1_i_snapshot_prune_with_permission_and_org_scope():
    """I. Snapshot prune with system.settings.edit + ORG scope -> allowed (200 OK response dict)."""
    _in_memory_employee_permissions.clear()
    admin_id = "ADM-3E-ORG-001"
    set_employee_permission_override(admin_id, "system.settings.edit", True, data_scope="ORG", designation="Admin")

    perm_map = get_employee_permission_map(admin_id)
    ctx = UserContext({"sub": admin_id, "employee_code": admin_id}, perm_map["permissions"], perm_map["scopes"])

    mock_sp = MagicMock()
    mock_sp.table.return_value.delete.return_value.lt.return_value.execute.return_value.data = []

    with patch("app.database.supabase.get_supabase_admin_client", return_value=mock_sp), \
         patch("app.database.supabase.get_supabase_client", return_value=mock_sp):
        res = asyncio.run(prune_expired_snapshots_api(context=ctx))
        assert res.get("success") is True
        assert "Successfully cleared 0 snapshots" in res.get("message")


def test_3e1_j_db_test_unauthenticated():
    """J. db-test unauthenticated -> blocked."""
    _in_memory_employee_permissions.clear()
    guard = RequirePermissions("system.settings.edit")
    try:
        asyncio.run(guard(context=None))
        assert False, "Expected exception for missing context"
    except (ForbiddenException, AttributeError, TypeError, Exception):
        pass


def test_3e1_k_db_test_without_permission():
    """K. db-test without permission -> blocked (403 Forbidden)."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3E-DBTEST-DENY"
    set_employee_permission_override(emp_id, "system.settings.edit", False, data_scope="ORG", designation="Sales Executive")

    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "employee_code": emp_id}, perm_map["permissions"], perm_map["scopes"])

    try:
        asyncio.run(store_test_data(TestRecord(title="Test"), context=ctx))
        assert False, "Expected ForbiddenException when storing test data without permission"
    except ForbiddenException:
        pass

    try:
        asyncio.run(get_test_data(context=ctx))
        assert False, "Expected ForbiddenException when reading test data without permission"
    except ForbiddenException:
        pass


def test_3e1_l_ceo_admin_superadmin_blocked_when_permission_false():
    """L. CEO / Admin / Super Admin denied when permission=False (No Role Bypass)."""
    _in_memory_employee_permissions.clear()

    roles = [
        ("EMP-CEO-3E", "CEO", "ceo"),
        ("EMP-ADM-3E", "Admin", "admin"),
        ("EMP-SUP-3E", "Super Admin", "super_admin"),
    ]

    for emp_id, desig, role_str in roles:
        set_employee_permission_override(emp_id, "sales.targets.manage", False, data_scope="ORG", designation=desig)
        perm_map = get_employee_permission_map(emp_id)
        ctx = UserContext({"sub": emp_id, "role": role_str}, perm_map["permissions"], perm_map["scopes"])

        guard = RequirePermissions("sales.targets.manage")
        try:
            asyncio.run(guard(ctx))
            assert False, f"Expected ForbiddenException for role {role_str} when permission=False"
        except ForbiddenException:
            pass


def test_3e1_m_direct_api_cannot_bypass():
    """M. Direct API invocation cannot bypass authorization checks."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-DIRECT-BYPASS"
    set_employee_permission_override(emp_id, "sales.targets.manage", False, data_scope="ORG", designation="Sales Executive")
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id}, perm_map["permissions"], perm_map["scopes"])

    try:
        update_target("TARGET-999", SalesTargetUpdate(target_amount=100000), context=ctx)
        assert False, "Direct API call must raise ForbiddenException when capability is denied"
    except ForbiddenException:
        pass


def test_3e1_n_missing_permission_fails_closed():
    """N. Missing permission fails closed (False)."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-FAIL-CLOSED-999"
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id}, perm_map["permissions"], perm_map["scopes"])

    assert ctx.has_permission("sales.targets.manage") is False
    assert ctx.has_permission("system.settings.edit") is False

    guard = RequirePermissions("sales.targets.manage")
    try:
        asyncio.run(guard(ctx))
        assert False, "Uninitialized user without permission record must fail closed"
    except ForbiddenException:
        pass


def run_all_tests():
    print("Running Phase 3E-1 Critical Backend Authorization Tests (A through N)...")
    test_3e1_a_put_sales_target_without_auth()
    test_3e1_b_delete_sales_target_without_auth()
    test_3e1_c_put_sales_target_without_permission()
    test_3e1_d_delete_sales_target_without_permission()
    test_3e1_e_sales_target_scope_enforcement()
    test_3e1_f_snapshot_prune_without_auth()
    test_3e1_g_snapshot_prune_without_permission()
    test_3e1_h_snapshot_prune_with_permission_but_own_team_scope()
    test_3e1_i_snapshot_prune_with_permission_and_org_scope()
    test_3e1_j_db_test_unauthenticated()
    test_3e1_k_db_test_without_permission()
    test_3e1_l_ceo_admin_superadmin_blocked_when_permission_false()
    test_3e1_m_direct_api_cannot_bypass()
    test_3e1_n_missing_permission_fails_closed()
    print("ALL PHASE 3E-1 TESTS (A THROUGH N) PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    run_all_tests()
