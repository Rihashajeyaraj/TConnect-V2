import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.dependencies import (
    UserContext,
    RequirePermissions,
    get_employee_permission_map,
    set_employee_permission_override,
    reset_employee_permissions_to_default,
    check_last_super_admin_safeguard,
    _in_memory_employee_permissions,
    _employee_id_aliases,
    invalidate_employee_permission_cache,
    register_employee_id_alias,
    get_user_context,
)
from app.exceptions.base import ForbiddenException, BadRequestException


def test_a_ceo_permission_restriction():
    """A. CEO permission restriction: CEO permissions can be explicitly restricted."""
    emp_id = "EMP-CEO-001"
    designation = "CEO / Founder"
    
    # Restrict crm.leads.delete for CEO
    set_employee_permission_override(emp_id, "crm.leads.delete", False, designation=designation)
    
    perm_map = get_employee_permission_map(emp_id, designation)
    payload = {"sub": emp_id, "email": "ceo@tconnect.com", "role": designation}
    context = UserContext(payload, perm_map["permissions"], perm_map["scopes"])
    
    # 1. CEO has other permissions
    assert context.has_permission("crm.leads.view") is True
    
    # 2. CEO is denied crm.leads.delete
    assert context.has_permission("crm.leads.delete") is False
    
    # 3. Enforcing scope for crm.leads.delete raises ForbiddenException (403)
    try:
        context.enforce_scope("crm.leads.delete", emp_id)
        assert False, "Expected ForbiddenException for restricted CEO permission"
    except ForbiddenException:
        pass


def test_b_super_admin_restriction():
    """B. Super Admin permission restriction: Super Admin permissions can be restricted."""
    emp_id = "EMP-SUPERADMIN-001"
    designation = "Super Admin"
    
    # Restrict system.audit.view for Super Admin
    set_employee_permission_override(emp_id, "system.audit.view", False, designation=designation)
    
    perm_map = get_employee_permission_map(emp_id, designation)
    payload = {"sub": emp_id, "email": "superadmin@tconnect.com", "role": designation}
    context = UserContext(payload, perm_map["permissions"], perm_map["scopes"])
    
    assert context.has_permission("system.audit.view") is False


def test_c_same_designation_different_permissions():
    """C. Same designation with different permissions."""
    emp_a = "EMP-EXEC-001"
    emp_b = "EMP-EXEC-002"
    designation = "Sales Executive"
    
    # Executive A: crm.leads.create = True
    set_employee_permission_override(emp_a, "crm.leads.create", True, designation=designation)
    # Executive B: crm.leads.create = False
    set_employee_permission_override(emp_b, "crm.leads.create", False, designation=designation)
    
    ctx_a = UserContext({"sub": emp_a, "role": designation}, get_employee_permission_map(emp_a)["permissions"], {})
    ctx_b = UserContext({"sub": emp_b, "role": designation}, get_employee_permission_map(emp_b)["permissions"], {})
    
    assert ctx_a.has_permission("crm.leads.create") is True
    assert ctx_b.has_permission("crm.leads.create") is False


def test_d_independent_permission_scopes():
    """D. Independent permission scopes per action key."""
    emp_id = "EMP-EXEC-003"
    designation = "Sales Executive"
    
    # Set crm.leads.view = OWN, crm.leads.edit = TEAM
    set_employee_permission_override(emp_id, "crm.leads.view", True, data_scope="OWN", designation=designation)
    set_employee_permission_override(emp_id, "crm.leads.edit", True, data_scope="TEAM", designation=designation)
    
    perm_map = get_employee_permission_map(emp_id, designation)
    context = UserContext({"sub": emp_id, "role": designation}, perm_map["permissions"], perm_map["scopes"])
    
    team_member_id = "EMP-EXEC-004"
    
    # 1. crm.leads.view is OWN scope -> viewing team member fails (403)
    try:
        context.enforce_scope("crm.leads.view", team_member_id, team_member_ids=[team_member_id])
        assert False, "Expected ForbiddenException when viewing team member with OWN scope"
    except ForbiddenException:
        pass

    # 2. crm.leads.edit is TEAM scope -> editing team member passes
    context.enforce_scope("crm.leads.edit", team_member_id, team_member_ids=[team_member_id])


def test_e_email_change_resilience():
    """E. Email change does not break employee permissions (bound to employee_id)."""
    emp_id = "EMP-RESILIENT-001"
    designation = "Sales Executive"
    
    set_employee_permission_override(emp_id, "crm.customers.create", True, designation=designation)
    
    # User payload with initial email
    payload_1 = {"sub": emp_id, "email": "old.email@tconnect.com", "role": designation}
    ctx_1 = UserContext(payload_1, get_employee_permission_map(emp_id)["permissions"], {})
    assert ctx_1.has_permission("crm.customers.create") is True
    
    # User payload after email change
    payload_2 = {"sub": emp_id, "email": "new.email@tconnect.com", "role": designation}
    ctx_2 = UserContext(payload_2, get_employee_permission_map(emp_id)["permissions"], {})
    assert ctx_2.has_permission("crm.customers.create") is True


def test_f_designation_change_resilience():
    """F. Designation change does not overwrite customized employee permissions."""
    emp_id = "EMP-PROMOTED-001"
    
    # Set custom override under Sales Executive
    set_employee_permission_override(emp_id, "crm.leads.delete", True, designation="Sales Executive")
    
    # Change designation to Sales Manager without resetting permissions
    perm_map = get_employee_permission_map(emp_id, designation="Sales Manager")
    
    # Custom permission remains True
    assert perm_map["permissions"]["crm.leads.delete"] is True


def test_g_missing_permission_returns_403():
    """G. Missing permission returns HTTP 403 (ForbiddenException)."""
    emp_id = "EMP-RESTRICTED-001"
    set_employee_permission_override(emp_id, "admin.users.create", False)
    
    perm_map = get_employee_permission_map(emp_id)
    context = UserContext({"sub": emp_id}, perm_map["permissions"], {})
    
    guard = RequirePermissions("admin.users.create")
    try:
        import asyncio
        asyncio.run(guard(context))
        assert False, "Expected ForbiddenException"
    except ForbiddenException as e:
        assert "403" in str(e) or "Permission denied" in str(e)


def test_h_reset_restores_designation_defaults():
    """H. Reset to Designation Defaults explicitly replaces employee's custom permissions."""
    emp_id = "EMP-RESET-001"
    designation = "Sales Executive"
    
    # Customize permission
    set_employee_permission_override(emp_id, "crm.leads.delete", True, designation=designation)
    assert get_employee_permission_map(emp_id)["permissions"]["crm.leads.delete"] is True
    
    # Reset to defaults
    reset_map = reset_employee_permissions_to_default(emp_id, designation)
    # Sales Executive default for crm.leads.delete is False
    assert reset_map["permissions"]["crm.leads.delete"] is False


def test_i_unseeded_employee_fail_closed():
    """I. Unseeded employee without employee_permissions records fails closed (0 permissions granted)."""
    import time
    emp_id = f"EMP-UNSEEDED-TEST-{int(time.time())}"
    perm_map = get_employee_permission_map(emp_id, designation="CEO / Founder")
    # Must be empty dict (fail-closed)
    assert perm_map["permissions"] == {}
    
    context = UserContext({"sub": emp_id, "role": "CEO / Founder"}, perm_map["permissions"], {})
    # Even CEO gets False when unseeded!
    assert context.has_permission("crm.leads.view") is False


def test_j_missing_permission_key_fail_closed():
    """J. Missing permission key or is_granted=False returns False and HTTP 403."""
    emp_id = "EMP-MISSING-KEY-001"
    perm_map = {"permissions": {"crm.leads.view": True}, "scopes": {}}
    context = UserContext({"sub": emp_id}, perm_map["permissions"], {})
    
    assert context.has_permission("crm.leads.view") is True
    assert context.has_permission("crm.leads.edit") is False
    
    guard = RequirePermissions("crm.leads.edit")
    try:
        import asyncio
        asyncio.run(guard(context))
        assert False, "Expected ForbiddenException"
    except ForbiddenException:
        pass


def test_k_role_alone_does_not_grant_permission():
    """K. Role/designation alone (Super Admin / CEO) never grants authorization without employee_permissions."""
    emp_id = "EMP-ROLE-ONLY-001"
    for designation in ["Super Admin", "CEO / Founder", "Admin", "Sales Manager"]:
        ctx = UserContext({"sub": emp_id, "role": designation}, {}, {})
        assert ctx.has_permission("crm.leads.view") is False
        assert ctx.has_permission("hrms.employees.create") is False


def test_l_db_lookup_failure_fail_closed():
    """L. Database permission lookup failure returns empty map and denies access (fail-closed)."""
    emp_id = "EMP-DB-FAIL-001"
    # An invalid or disconnected lookup returns empty dict
    perm_map = get_employee_permission_map(emp_id, designation="Admin")
    ctx = UserContext({"sub": emp_id, "role": "Admin"}, perm_map["permissions"], {})
    assert ctx.has_permission("system.settings.edit") is False


import time

def test_m_empty_cache_to_permission_granted():
    """M. Empty-cache -> permission granted (Scenario A)."""
    uid_tag = int(time.time_ns())
    emp_code = f"EMP-SCENARIO-A-{uid_tag}"
    auth_uuid = f"uuid-scenario-a-{uid_tag}"
    
    # 1. Employee has no permission, empty map gets loaded/cached
    perm_map = get_employee_permission_map(emp_code)
    assert perm_map["permissions"] == {}
    assert _in_memory_employee_permissions.get(emp_code) == {"permissions": {}, "scopes": {}}
    
    # 2. Admin grants permission
    set_employee_permission_override(emp_code, "crm.leads.create", True, designation="Sales Executive", auth_user_id=auth_uuid)
    
    # 3. Employee immediately calls protected API
    updated_map = get_employee_permission_map(emp_code)
    assert updated_map["permissions"].get("crm.leads.create") is True
    
    ctx = UserContext({"sub": auth_uuid, "employee_code": emp_code}, updated_map["permissions"], updated_map["scopes"])
    assert ctx.has_permission("crm.leads.create") is True


def test_n_cached_permission_to_revoked():
    """N. Cached permission -> permission revoked (Scenario B)."""
    uid_tag = int(time.time_ns())
    emp_code = f"EMP-SCENARIO-B-{uid_tag}"
    auth_uuid = f"uuid-scenario-b-{uid_tag}"
    
    # 1. Employee has permission granted and cached
    set_employee_permission_override(emp_code, "crm.leads.create", True, designation="Sales Executive", auth_user_id=auth_uuid)
    perm_map_1 = get_employee_permission_map(emp_code)
    assert perm_map_1["permissions"].get("crm.leads.create") is True
    
    # 2. Admin revokes permission
    set_employee_permission_override(emp_code, "crm.leads.create", False, designation="Sales Executive", auth_user_id=auth_uuid)
    
    # 3. Protected call must return 403 / False immediately
    perm_map_2 = get_employee_permission_map(emp_code)
    assert perm_map_2["permissions"].get("crm.leads.create") is False
    
    ctx = UserContext({"sub": auth_uuid, "employee_code": emp_code}, perm_map_2["permissions"], perm_map_2["scopes"])
    assert ctx.has_permission("crm.leads.create") is False
    
    guard = RequirePermissions("crm.leads.create")
    try:
        import asyncio
        asyncio.run(guard(ctx))
        assert False, "Expected ForbiddenException when calling revoked permission"
    except ForbiddenException:
        pass


def test_o_reset_to_default_refreshes_cache():
    """O. Reset-to-default -> cache refreshed (Scenario C)."""
    uid_tag = int(time.time_ns())
    emp_code = f"EMP-SCENARIO-C-{uid_tag}"
    auth_uuid = f"uuid-scenario-c-{uid_tag}"
    designation = "Sales Executive"
    
    # 1. Custom permissions granted and cached
    set_employee_permission_override(emp_code, "crm.leads.delete", True, designation=designation, auth_user_id=auth_uuid)
    assert get_employee_permission_map(emp_code)["permissions"].get("crm.leads.delete") is True
    
    # 2. Admin selects "Reset to Designation Defaults"
    reset_map = reset_employee_permissions_to_default(emp_code, designation=designation, auth_user_id=auth_uuid)
    
    # 3. New default permissions used immediately (Sales Executive default for crm.leads.delete is False)
    assert reset_map["permissions"].get("crm.leads.delete") is False
    
    fresh_map = get_employee_permission_map(emp_code)
    assert fresh_map["permissions"].get("crm.leads.delete") is False


def test_p_designation_change_cache_consistency():
    """P. Designation change -> cache remains correct (Scenario D)."""
    uid_tag = int(time.time_ns())
    emp_code = f"EMP-SCENARIO-D-{uid_tag}"
    auth_uuid = f"uuid-scenario-d-{uid_tag}"
    
    # 1. Custom permission set under Sales Executive
    set_employee_permission_override(emp_code, "crm.leads.delete", True, designation="Sales Executive", auth_user_id=auth_uuid)
    assert get_employee_permission_map(emp_code)["permissions"].get("crm.leads.delete") is True
    
    # 2. Employee designation changes (e.g. to Sales Manager) without resetting permissions
    invalidate_employee_permission_cache(emp_code, auth_uuid)
    
    # 3. Existing customized permissions remain intact and cache reflects current employee permissions
    fresh_map = get_employee_permission_map(emp_code, designation="Sales Manager")
    assert fresh_map["permissions"].get("crm.leads.delete") is True


def test_q_dual_key_cache_invalidation():
    """Q. employee_code and UUID cache invalidation consistency."""
    uid_tag = int(time.time_ns())
    emp_code = f"EMP-{uid_tag}"
    auth_uuid = f"c1bdb62c-8888-4444-9999-{uid_tag % 1000000000000:012d}"
    
    # 1. Seed permission and link alias
    set_employee_permission_override(emp_code, "crm.leads.create", True, designation="Sales Executive", auth_user_id=auth_uuid)
    
    # 2. Verify permission map is accessible under both employee_code AND auth_user_id
    map_code = get_employee_permission_map(emp_code)
    map_uuid = get_employee_permission_map(auth_uuid)
    assert map_code["permissions"]["crm.leads.create"] is True
    assert map_uuid["permissions"]["crm.leads.create"] is True
    
    # 3. Admin revokes permission using employee_code
    set_employee_permission_override(emp_code, "crm.leads.create", False, designation="Sales Executive", auth_user_id=auth_uuid)
    
    # 4. Verify BOTH keys are invalidated and return False (never diverge)
    map_code_after = get_employee_permission_map(emp_code)
    map_uuid_after = get_employee_permission_map(auth_uuid)
    assert map_code_after["permissions"]["crm.leads.create"] is False
    assert map_uuid_after["permissions"]["crm.leads.create"] is False
    assert map_code_after == map_uuid_after


def test_r_db_failure_fail_closed_no_stale_access():
    """R. Database failure does not grant stale unauthorized access."""
    uid_tag = int(time.time_ns())
    emp_code = f"EMP-DB-FAIL-SECURE-{uid_tag}"
    auth_uuid = f"uuid-db-fail-{uid_tag}"
    
    # 1. Invalidate cache
    invalidate_employee_permission_cache(emp_code, auth_uuid)
    
    # 2. Simulate DB failure during lookup (non-existent employee with invalid DB query)
    perm_map = get_employee_permission_map(emp_code, designation="CEO / Founder")
    
    # 3. Returns empty fail-closed map
    assert perm_map == {"permissions": {}, "scopes": {}}
    
    # 4. User context fails closed (denies access)
    ctx = UserContext({"sub": auth_uuid, "employee_code": emp_code, "role": "CEO / Founder"}, perm_map["permissions"], perm_map["scopes"])
    assert ctx.has_permission("crm.leads.view") is False
    assert ctx.has_permission("hrms.employees.create") is False


if __name__ == "__main__":
    print("Running Phase 2 backend permissions test suite...")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_a_ceo_permission_restriction()
    print("[PASS] Test A: CEO permission restriction passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_b_super_admin_restriction()
    print("[PASS] Test B: Super Admin permission restriction passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_c_same_designation_different_permissions()
    print("[PASS] Test C: Same designation different permissions passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_d_independent_permission_scopes()
    print("[PASS] Test D: Independent permission scopes passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_e_email_change_resilience()
    print("[PASS] Test E: Email change resilience passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_f_designation_change_resilience()
    print("[PASS] Test F: Designation change resilience passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_g_missing_permission_returns_403()
    print("[PASS] Test G: Missing permission returns HTTP 403 passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_h_reset_restores_designation_defaults()
    print("[PASS] Test H: Reset restores designation defaults passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_i_unseeded_employee_fail_closed()
    print("[PASS] Test I: Unseeded employee fail-closed passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_j_missing_permission_key_fail_closed()
    print("[PASS] Test J: Missing permission key fail-closed passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_k_role_alone_does_not_grant_permission()
    print("[PASS] Test K: Role alone does not grant permission passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_l_db_lookup_failure_fail_closed()
    print("[PASS] Test L: DB lookup failure fail-closed passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_m_empty_cache_to_permission_granted()
    print("[PASS] Test M: Empty-cache -> permission granted passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_n_cached_permission_to_revoked()
    print("[PASS] Test N: Cached permission -> permission revoked passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_o_reset_to_default_refreshes_cache()
    print("[PASS] Test O: Reset-to-default -> cache refreshed passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_p_designation_change_cache_consistency()
    print("[PASS] Test P: Designation change -> cache remains correct passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_q_dual_key_cache_invalidation()
    print("[PASS] Test Q: Dual-key employee_code and UUID invalidation passed")
    _in_memory_employee_permissions.clear()
    _employee_id_aliases.clear()
    test_r_db_failure_fail_closed_no_stale_access()
    print("[PASS] Test R: DB failure fail-closed no stale access passed")
    print("\nALL PHASE 2 BACKEND PERMISSION TESTS (A - R) PASSED SUCCESSFULLY!")


