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
    set_employee_permissions,
    set_employee_single_permission,
    reset_employee_permissions_to_default,
    invalidate_employee_permission_cache,
    _in_memory_employee_permissions,
    _employee_id_aliases,
)
from app.exceptions.base import ForbiddenException
from app.modules.admin.routes import get_admin_dashboard_kpis
from app.modules.users.routes import (
    get_all_users,
    assign_sales_executives,
    get_assigned_executives,
    update_user_permissions,
    get_user_permissions,
    reset_user_permissions,
    UpdateUserPermissionsPayload,
)
from app.modules.audit.routes import list_audit_logs, export_audit_logs


def test_3d_a_permission_granted_access():
    """A. Permission granted -> access (200 OK)."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3D-GRANT-001"
    set_employee_permission_override(emp_id, "admin.users.view", True, designation="Admin")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "employee_code": emp_id}, perm_map["permissions"], perm_map["scopes"])
    assert ctx.has_permission("admin.users.view") is True
    
    guard = RequirePermissions("admin.users.view")
    res_ctx = asyncio.run(guard(ctx))
    assert res_ctx is ctx


def test_3d_b_permission_denied_403():
    """B. Permission denied -> HTTP 403."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3D-DENY-001"
    set_employee_permission_override(emp_id, "admin.users.view", False, designation="Admin")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "employee_code": emp_id}, perm_map["permissions"], perm_map["scopes"])
    assert ctx.has_permission("admin.users.view") is False
    
    guard = RequirePermissions("admin.users.view")
    try:
        asyncio.run(guard(ctx))
        assert False, "Expected ForbiddenException when permission is denied"
    except ForbiddenException:
        pass


def test_3d_c_same_designation_different_permissions():
    """C. Same designation, different permissions."""
    _in_memory_employee_permissions.clear()
    emp_a = "EMP-3D-SAME-001"
    emp_b = "EMP-3D-SAME-002"
    designation = "Sales Executive"
    
    set_employee_permission_override(emp_a, "admin.users.view", True, designation=designation)
    set_employee_permission_override(emp_b, "admin.users.view", False, designation=designation)
    
    ctx_a = UserContext({"sub": emp_a}, get_employee_permission_map(emp_a)["permissions"], {})
    ctx_b = UserContext({"sub": emp_b}, get_employee_permission_map(emp_b)["permissions"], {})
    
    assert ctx_a.has_permission("admin.users.view") is True
    assert ctx_b.has_permission("admin.users.view") is False


def test_3d_d_ceo_denied_when_permission_false():
    """D. CEO denied when permission=False (No CEO Bypass)."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3D-CEO-001"
    set_employee_permission_override(emp_id, "admin.users.view", False, designation="CEO")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "role": "ceo"}, perm_map["permissions"], perm_map["scopes"])
    
    guard = RequirePermissions("admin.users.view")
    try:
        asyncio.run(guard(ctx))
        assert False, "CEO must be denied when permission=False"
    except ForbiddenException:
        pass


def test_3d_e_super_admin_denied_when_permission_false():
    """E. Super Admin denied when permission=False (No Super Admin Bypass)."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3D-SA-001"
    set_employee_permission_override(emp_id, "admin.users.view", False, designation="Super Admin")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "role": "super_admin"}, perm_map["permissions"], perm_map["scopes"])
    
    guard = RequirePermissions("admin.users.view")
    try:
        asyncio.run(guard(ctx))
        assert False, "Super Admin must be denied when permission=False"
    except ForbiddenException:
        pass


def test_3d_f_admin_denied_when_permission_false():
    """F. Admin denied when permission=False (No Admin Bypass)."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3D-ADM-001"
    set_employee_permission_override(emp_id, "admin.users.view", False, designation="Admin")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "role": "admin"}, perm_map["permissions"], perm_map["scopes"])
    
    guard = RequirePermissions("admin.users.view")
    try:
        asyncio.run(guard(ctx))
        assert False, "Admin must be denied when permission=False"
    except ForbiddenException:
        pass


def test_3d_g_direct_api_cannot_bypass():
    """G. Direct API cannot bypass authorization check."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3D-DIRECT-001"
    set_employee_permission_override(emp_id, "admin.users.view", False, designation="Admin")
    
    ctx = UserContext({"sub": emp_id, "role": "admin"}, get_employee_permission_map(emp_id)["permissions"], {})
    guard = RequirePermissions("admin.users.view")
    try:
        asyncio.run(guard(ctx))
        assert False, "Direct API call without permission must fail closed with 403"
    except ForbiddenException:
        pass


def test_3d_h_employee_cannot_modify_own_permissions():
    """H. Employee cannot modify own permissions (self-modification forbidden)."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3D-SELF-MOD-001"
    set_employee_permission_override(emp_id, "admin.permissions.manage", True, designation="Admin")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "employee_code": emp_id}, perm_map["permissions"], perm_map["scopes"])
    user_payload = {"sub": emp_id, "employee_code": emp_id}
    
    payload = UpdateUserPermissionsPayload(permissions={"crm.leads.view": True})
    try:
        asyncio.run(update_user_permissions(emp_id, payload, user_payload=user_payload, context=ctx))
        assert False, "Expected ForbiddenException when employee attempts self-permission modification"
    except ForbiddenException as fe:
        assert "forbidden from modifying their own permissions" in str(fe)


def test_3d_i_employee_cannot_modify_another_without_permission():
    """I. Employee cannot modify another employee's permissions without admin.permissions.manage."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3D-OTHER-DENIED"
    target_id = "EMP-3D-TARGET-001"
    set_employee_permission_override(emp_id, "admin.permissions.manage", False, designation="Sales Executive")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "employee_code": emp_id}, perm_map["permissions"], perm_map["scopes"])
    
    guard = RequirePermissions("admin.permissions.manage")
    try:
        asyncio.run(guard(ctx))
        assert False, "Expected ForbiddenException when modifying another without permission"
    except ForbiddenException:
        pass


def test_3d_j_unauthorized_employee_cannot_read_another_permissions():
    """J. Unauthorized employee cannot read another employee's permissions."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3D-READ-DENIED"
    set_employee_permission_override(emp_id, "admin.permissions.manage", False, designation="Sales Executive")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "employee_code": emp_id}, perm_map["permissions"], perm_map["scopes"])
    
    guard = RequirePermissions("admin.permissions.manage")
    try:
        asyncio.run(guard(ctx))
        assert False, "Expected ForbiddenException when reading permissions without admin.permissions.manage"
    except ForbiddenException:
        pass


def test_3d_k_permission_management_action_requires_correct_permission():
    """K. Permission-management action requires admin.permissions.manage."""
    _in_memory_employee_permissions.clear()
    emp_authorized = "EMP-3D-MGMT-AUTH"
    emp_unauthorized = "EMP-3D-MGMT-UNAUTH"
    
    set_employee_permission_override(emp_authorized, "admin.permissions.manage", True, designation="Admin")
    set_employee_permission_override(emp_unauthorized, "admin.permissions.manage", False, designation="Admin")
    
    ctx_auth = UserContext({"sub": emp_authorized}, get_employee_permission_map(emp_authorized)["permissions"], {})
    ctx_unauth = UserContext({"sub": emp_unauthorized}, get_employee_permission_map(emp_unauthorized)["permissions"], {})
    
    guard = RequirePermissions("admin.permissions.manage")
    # Authorized user succeeds
    assert asyncio.run(guard(ctx_auth)) is ctx_auth
    
    # Unauthorized user fails
    try:
        asyncio.run(guard(ctx_unauth))
        assert False, "Unauthorized user should be denied"
    except ForbiddenException:
        pass


def test_3d_l_designation_change_preserves_customized_permissions():
    """L. Designation change preserves customized permissions in employee_permissions."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3D-DESIG-CHANGE"
    set_employee_permissions(
        employee_id=emp_id,
        permissions={"custom.feature.flag": True, "admin.users.view": True},
        scopes={"admin.users.view": "ORG"}
    )
    
    before_map = get_employee_permission_map(emp_id)
    assert before_map["permissions"].get("custom.feature.flag") is True
    
    # Simulating designation update (e.g. from Sales Executive to Sales Manager)
    # The designation defaults are NOT re-applied automatically, preserving custom permissions
    after_map = get_employee_permission_map(emp_id, designation="Sales Manager")
    assert after_map["permissions"].get("custom.feature.flag") is True
    assert after_map["scopes"].get("admin.users.view") == "ORG"


def test_3d_m_reset_to_default_works_correctly():
    """M. Reset-to-default works correctly when explicitly invoked."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3D-RESET-001"
    set_employee_permissions(emp_id, {"admin.users.view": False}, {"admin.users.view": "OWN"})
    
    reset_map = reset_employee_permissions_to_default(emp_id, designation="Admin")
    assert reset_map["permissions"].get("admin.users.view") is True
    assert reset_map["permissions"].get("crm.leads.view") is True


def test_3d_n_cache_invalidation_after_permission_change():
    """N. Cache invalidation after permission change."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3D-CACHE-INV"
    _in_memory_employee_permissions[emp_id] = {"permissions": {"admin.users.view": True}, "scopes": {}}
    
    assert emp_id in _in_memory_employee_permissions
    invalidate_employee_permission_cache(emp_id)
    assert emp_id not in _in_memory_employee_permissions


def test_3d_o_audit_view_enforcement():
    """O. Audit view enforcement (system.audit.view)."""
    _in_memory_employee_permissions.clear()
    emp_auth = "EMP-3D-AUD-VIEW-AUTH"
    emp_unauth = "EMP-3D-AUD-VIEW-UNAUTH"
    
    set_employee_permission_override(emp_auth, "system.audit.view", True, designation="Admin")
    set_employee_permission_override(emp_unauth, "system.audit.view", False, designation="Admin")
    
    ctx_a = UserContext({"sub": emp_auth}, get_employee_permission_map(emp_auth)["permissions"], {})
    ctx_u = UserContext({"sub": emp_unauth}, get_employee_permission_map(emp_unauth)["permissions"], {})
    
    guard = RequirePermissions("system.audit.view")
    assert asyncio.run(guard(ctx_a)) is ctx_a
    
    try:
        asyncio.run(guard(ctx_u))
        assert False, "Expected ForbiddenException for audit view"
    except ForbiddenException:
        pass


def test_3d_p_audit_export_enforcement():
    """P. Audit export enforcement (system.audit.export)."""
    _in_memory_employee_permissions.clear()
    emp_auth = "EMP-3D-AUD-EXP-AUTH"
    emp_unauth = "EMP-3D-AUD-EXP-UNAUTH"
    
    set_employee_permission_override(emp_auth, "system.audit.export", True, designation="Admin")
    set_employee_permission_override(emp_unauth, "system.audit.export", False, designation="Admin")
    
    ctx_a = UserContext({"sub": emp_auth}, get_employee_permission_map(emp_auth)["permissions"], {})
    ctx_u = UserContext({"sub": emp_unauth}, get_employee_permission_map(emp_unauth)["permissions"], {})
    
    guard = RequirePermissions("system.audit.export")
    assert asyncio.run(guard(ctx_a)) is ctx_a
    
    try:
        asyncio.run(guard(ctx_u))
        assert False, "Expected ForbiddenException for audit export"
    except ForbiddenException:
        pass


def test_3d_q_view_allowed_export_denied():
    """Q. View allowed + export denied."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3D-AUD-SPLIT"
    set_employee_permissions(
        employee_id=emp_id,
        permissions={"system.audit.view": True, "system.audit.export": False},
        scopes={"system.audit.view": "ORG"}
    )
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id}, perm_map["permissions"], perm_map["scopes"])
    
    view_guard = RequirePermissions("system.audit.view")
    export_guard = RequirePermissions("system.audit.export")
    
    assert asyncio.run(view_guard(ctx)) is ctx
    
    try:
        asyncio.run(export_guard(ctx))
        assert False, "Export must be denied when system.audit.export is False"
    except ForbiddenException:
        pass


def test_3d_r_audit_data_scope_enforcement():
    """R. Audit data scope enforcement (OWN scope)."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3D-AUD-OWN"
    other_emp = "EMP-3D-AUD-OTHER"
    set_employee_permission_override(emp_id, "system.audit.view", True, data_scope="OWN")
    
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id, "employee_code": emp_id}, perm_map["permissions"], perm_map["scopes"])
    
    ctx.enforce_scope("system.audit.view", emp_id)
    
    try:
        ctx.enforce_scope("system.audit.view", other_emp)
        assert False, "Expected ForbiddenException when accessing audit log outside OWN scope"
    except ForbiddenException:
        pass


def test_3d_s_missing_permission_fails_closed():
    """S. Missing permission fails closed."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3D-MISSING-PERM"
    perm_map = get_employee_permission_map(emp_id)
    ctx = UserContext({"sub": emp_id}, perm_map["permissions"], perm_map["scopes"])
    
    guard = RequirePermissions("nonexistent.admin.permission")
    try:
        asyncio.run(guard(ctx))
        assert False, "Missing permission key must fail closed with ForbiddenException"
    except ForbiddenException:
        pass


def test_3d_t_db_lookup_failure_fails_closed():
    """T. DB lookup failure fails closed."""
    _in_memory_employee_permissions.clear()
    emp_id = "EMP-3D-DB-FAIL"
    with patch("app.database.supabase.get_supabase_admin_client", side_effect=Exception("DB connection down")):
        with patch("app.database.supabase.get_supabase_client", side_effect=Exception("DB connection down")):
            invalidate_employee_permission_cache(emp_id)
            perm_map = get_employee_permission_map(emp_id)
            assert perm_map["permissions"] == {}
            assert perm_map["scopes"] == {}
            
            ctx = UserContext({"sub": emp_id}, perm_map["permissions"], perm_map["scopes"])
            guard = RequirePermissions("admin.users.view")
            try:
                asyncio.run(guard(ctx))
                assert False, "DB failure must fail closed with ForbiddenException"
            except ForbiddenException:
                pass


def test_3d_u_no_role_only_authorization_bypass_remains():
    """U. No role-only authorization bypass remains for any role."""
    _in_memory_employee_permissions.clear()
    roles_to_test = ["ceo", "super_admin", "admin", "sales_manager", "team_lead", "sales_executive"]
    for role in roles_to_test:
        emp_id = f"EMP-3D-NOROLEBYPASS-{role.upper()}"
        set_employee_permission_override(emp_id, "admin.users.view", False, designation=role)
        
        perm_map = get_employee_permission_map(emp_id)
        ctx = UserContext({"sub": emp_id, "role": role}, perm_map["permissions"], perm_map["scopes"])
        
        guard = RequirePermissions("admin.users.view")
        try:
            asyncio.run(guard(ctx))
            assert False, f"Role '{role}' bypassed permission check when permission=False!"
        except ForbiddenException:
            pass


if __name__ == "__main__":
    print("Running Phase 3D tests A through U...")
    test_3d_a_permission_granted_access()
    test_3d_b_permission_denied_403()
    test_3d_c_same_designation_different_permissions()
    test_3d_d_ceo_denied_when_permission_false()
    test_3d_e_super_admin_denied_when_permission_false()
    test_3d_f_admin_denied_when_permission_false()
    test_3d_g_direct_api_cannot_bypass()
    test_3d_h_employee_cannot_modify_own_permissions()
    test_3d_i_employee_cannot_modify_another_without_permission()
    test_3d_j_unauthorized_employee_cannot_read_another_permissions()
    test_3d_k_permission_management_action_requires_correct_permission()
    test_3d_l_designation_change_preserves_customized_permissions()
    test_3d_m_reset_to_default_works_correctly()
    test_3d_n_cache_invalidation_after_permission_change()
    test_3d_o_audit_view_enforcement()
    test_3d_p_audit_export_enforcement()
    test_3d_q_view_allowed_export_denied()
    test_3d_r_audit_data_scope_enforcement()
    test_3d_s_missing_permission_fails_closed()
    test_3d_t_db_lookup_failure_fails_closed()
    test_3d_u_no_role_only_authorization_bypass_remains()
    print("ALL PHASE 3D TESTS (A THROUGH U) PASSED SUCCESSFULLY!")
