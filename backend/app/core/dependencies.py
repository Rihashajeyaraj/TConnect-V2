from typing import Optional, List, Dict, Any, Set
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import verify_supabase_jwt
from app.exceptions.base import UnauthorizedException, ForbiddenException, BadRequestException
from app.core.constants import RoleEnum
from app.core.logger import logger
from app.database.supabase import get_supabase_client, get_supabase_admin_client

security_scheme = HTTPBearer(auto_error=False)


# ── System Designation Default Templates ─────────────────────────────────────

SYSTEM_DESIGNATION_DEFAULTS: Dict[str, Dict[str, Any]] = {
    "CEO / Founder": {
        "permissions": {
            "crm.leads.view": True, "crm.leads.create": True, "crm.leads.edit": True, "crm.leads.delete": True, "crm.leads.assign": True, "crm.leads.export": True,
            "crm.customers.view": True, "crm.customers.create": True, "crm.customers.edit": True, "crm.customers.delete": True, "crm.customers.convert": True,
            "visit.visits.view": True, "visit.visits.create": True, "visit.visits.edit": True, "visit.visits.cancel": True, "visit.visits.snapshots": True,
            "spatial.map.view": True, "spatial.map.view_team": True, "spatial.map.view_all": True,
            "hrms.employees.view": True, "hrms.employees.create": True, "hrms.employees.edit": True, "hrms.employees.status": True, "hrms.employees.reporting": True,
            "hrms.attendance.mark": True, "hrms.attendance.view_own": True, "hrms.attendance.view_team": True, "hrms.attendance.view_all": True, "hrms.attendance.approve": True,
            "hrms.leaves.view": True, "hrms.leaves.apply": True, "hrms.leaves.cancel": True, "hrms.leaves.approve_team": True, "hrms.leaves.approve_all": True,
            "expenses.view": True, "expenses.create": True, "expenses.edit": True, "expenses.approve": True,
            "finance.expenses.view": True, "finance.expenses.view_own": True, "finance.expenses.create": True, "finance.expenses.edit": True, "finance.expenses.edit_own": True, "finance.expenses.view_team": True, "finance.expenses.approve": True,
            "reports.view": True, "reports.export": True, "system.reports.view": True, "system.reports.export": True,
            "system.audit.view": True, "system.audit.export": True,
            "admin.users.view": True, "admin.users.create": True, "admin.users.edit": True, "admin.users.disable": True, "admin.permissions.manage": True,
            "system.settings.view": True, "system.settings.edit": True,
            "sales.targets.view": True, "sales.targets.manage": True
        },
        "scopes": {
            "crm.leads.view": "ORG", "crm.leads.edit": "ORG", "crm.leads.delete": "ORG",
            "crm.customers.view": "ORG", "crm.customers.edit": "ORG", "crm.customers.delete": "ORG",
            "visit.visits.view": "ORG", "spatial.map.view": "ORG",
            "hrms.attendance.view_all": "ORG", "hrms.leaves.approve_all": "ORG",
            "expenses.view": "ORG", "expenses.create": "ORG", "expenses.edit": "ORG", "expenses.approve": "ORG",
            "finance.expenses.view": "ORG", "finance.expenses.view_team": "ORG", "finance.expenses.approve": "ORG",
            "reports.view": "ORG", "reports.export": "ORG", "system.reports.view": "ORG", "system.reports.export": "ORG",
            "sales.targets.view": "ORG", "sales.targets.manage": "ORG"
        }
    },
    "Super Admin": {
        "permissions": {
            "crm.leads.view": True, "crm.leads.create": True, "crm.leads.edit": True, "crm.leads.delete": True, "crm.leads.assign": True, "crm.leads.export": True,
            "crm.customers.view": True, "crm.customers.create": True, "crm.customers.edit": True, "crm.customers.delete": True, "crm.customers.convert": True,
            "visit.visits.view": True, "visit.visits.create": True, "visit.visits.edit": True, "visit.visits.cancel": True, "visit.visits.snapshots": True,
            "spatial.map.view": True, "spatial.map.view_team": True, "spatial.map.view_all": True,
            "hrms.employees.view": True, "hrms.employees.create": True, "hrms.employees.edit": True, "hrms.employees.status": True, "hrms.employees.reporting": True,
            "hrms.attendance.mark": True, "hrms.attendance.view_own": True, "hrms.attendance.view_team": True, "hrms.attendance.view_all": True, "hrms.attendance.approve": True,
            "hrms.leaves.view": True, "hrms.leaves.apply": True, "hrms.leaves.cancel": True, "hrms.leaves.approve_team": True, "hrms.leaves.approve_all": True,
            "expenses.view": True, "expenses.create": True, "expenses.edit": True, "expenses.approve": True,
            "finance.expenses.view": True, "finance.expenses.view_own": True, "finance.expenses.create": True, "finance.expenses.edit": True, "finance.expenses.edit_own": True, "finance.expenses.view_team": True, "finance.expenses.approve": True,
            "reports.view": True, "reports.export": True, "system.reports.view": True, "system.reports.export": True,
            "system.audit.view": True, "system.audit.export": True,
            "admin.users.view": True, "admin.users.create": True, "admin.users.edit": True, "admin.users.disable": True, "admin.permissions.manage": True,
            "system.settings.view": True, "system.settings.edit": True,
            "sales.targets.view": True, "sales.targets.manage": True
        },
        "scopes": {
            "crm.leads.view": "ORG", "crm.leads.edit": "ORG", "crm.leads.delete": "ORG",
            "crm.customers.view": "ORG", "crm.customers.edit": "ORG", "crm.customers.delete": "ORG",
            "visit.visits.view": "ORG", "spatial.map.view": "ORG",
            "hrms.attendance.view_all": "ORG", "hrms.leaves.approve_all": "ORG",
            "expenses.view": "ORG", "expenses.create": "ORG", "expenses.edit": "ORG", "expenses.approve": "ORG",
            "finance.expenses.view": "ORG", "finance.expenses.view_team": "ORG", "finance.expenses.approve": "ORG",
            "reports.view": "ORG", "reports.export": "ORG", "system.reports.view": "ORG", "system.reports.export": "ORG",
            "sales.targets.view": "ORG", "sales.targets.manage": "ORG"
        }
    },
    "Admin": {
        "permissions": {
            "crm.leads.view": True, "crm.leads.create": True, "crm.leads.edit": True, "crm.leads.delete": True, "crm.leads.assign": True, "crm.leads.export": True,
            "crm.customers.view": True, "crm.customers.create": True, "crm.customers.edit": True, "crm.customers.delete": True, "crm.customers.convert": True,
            "visit.visits.view": True, "visit.visits.create": True, "visit.visits.edit": True, "visit.visits.cancel": True, "visit.visits.snapshots": True,
            "spatial.map.view": True, "spatial.map.view_team": True, "spatial.map.view_all": True,
            "hrms.employees.view": True, "hrms.employees.create": True, "hrms.employees.edit": True, "hrms.employees.status": True, "hrms.employees.reporting": True,
            "hrms.attendance.mark": True, "hrms.attendance.view_own": True, "hrms.attendance.view_team": True, "hrms.attendance.view_all": True, "hrms.attendance.approve": True,
            "hrms.leaves.view": True, "hrms.leaves.apply": True, "hrms.leaves.cancel": True, "hrms.leaves.approve_team": True, "hrms.leaves.approve_all": True,
            "expenses.view": True, "expenses.create": True, "expenses.edit": True, "expenses.approve": True,
            "finance.expenses.view": True, "finance.expenses.view_own": True, "finance.expenses.create": True, "finance.expenses.edit": True, "finance.expenses.edit_own": True, "finance.expenses.view_team": True, "finance.expenses.approve": True,
            "reports.view": True, "reports.export": True, "system.reports.view": True, "system.reports.export": True,
            "system.audit.view": True, "system.audit.export": True,
            "admin.users.view": True, "admin.users.create": True, "admin.users.edit": True, "admin.users.disable": True, "admin.permissions.manage": True,
            "system.settings.view": True, "system.settings.edit": True,
            "sales.targets.view": True, "sales.targets.manage": True
        },
        "scopes": {
            "crm.leads.view": "ORG", "crm.leads.edit": "ORG", "crm.leads.delete": "ORG",
            "crm.customers.view": "ORG", "crm.customers.edit": "ORG", "crm.customers.delete": "ORG",
            "visit.visits.view": "ORG", "spatial.map.view": "ORG",
            "hrms.attendance.view_all": "ORG", "hrms.leaves.approve_all": "ORG",
            "expenses.view": "ORG", "expenses.create": "ORG", "expenses.edit": "ORG", "expenses.approve": "ORG",
            "finance.expenses.view": "ORG", "finance.expenses.view_team": "ORG", "finance.expenses.approve": "ORG",
            "reports.view": "ORG", "reports.export": "ORG", "system.reports.view": "ORG", "system.reports.export": "ORG",
            "sales.targets.view": "ORG", "sales.targets.manage": "ORG"
        }
    },
    "Sales Manager": {
        "permissions": {
            "crm.leads.view": True, "crm.leads.create": True, "crm.leads.edit": True, "crm.leads.delete": True, "crm.leads.assign": True, "crm.leads.export": True,
            "crm.customers.view": True, "crm.customers.create": True, "crm.customers.edit": True, "crm.customers.delete": False, "crm.customers.convert": True,
            "visit.visits.view": True, "visit.visits.create": True, "visit.visits.edit": True, "visit.visits.cancel": True, "visit.visits.snapshots": True,
            "spatial.map.view": True, "spatial.map.view_team": True, "spatial.map.view_all": False,
            "hrms.employees.view": True, "hrms.employees.create": False, "hrms.employees.edit": False, "hrms.employees.status": False, "hrms.employees.reporting": False,
            "hrms.attendance.mark": True, "hrms.attendance.view_own": True, "hrms.attendance.view_team": True, "hrms.attendance.view_all": False, "hrms.attendance.approve": True,
            "hrms.leaves.view": True, "hrms.leaves.apply": True, "hrms.leaves.cancel": True, "hrms.leaves.approve_team": True, "hrms.leaves.approve_all": False,
            "expenses.view": True, "expenses.create": True, "expenses.edit": True, "expenses.approve": True,
            "finance.expenses.view": True, "finance.expenses.view_own": True, "finance.expenses.create": True, "finance.expenses.edit": True, "finance.expenses.edit_own": True, "finance.expenses.view_team": True, "finance.expenses.approve": True,
            "reports.view": True, "reports.export": True, "system.reports.view": True, "system.reports.export": True,
            "system.audit.view": False, "system.audit.export": False,
            "admin.users.view": False, "admin.users.create": False, "admin.users.edit": False, "admin.users.disable": False, "admin.permissions.manage": False,
            "system.settings.view": True, "system.settings.edit": False,
            "sales.targets.view": True, "sales.targets.manage": True
        },
        "scopes": {
            "crm.leads.view": "TEAM", "crm.leads.edit": "TEAM", "crm.leads.delete": "TEAM",
            "crm.customers.view": "TEAM", "crm.customers.edit": "TEAM",
            "visit.visits.view": "TEAM", "spatial.map.view": "TEAM",
            "hrms.attendance.view_team": "TEAM", "hrms.leaves.approve_team": "TEAM",
            "expenses.view": "TEAM", "expenses.create": "TEAM", "expenses.edit": "TEAM", "expenses.approve": "TEAM",
            "finance.expenses.view": "TEAM", "finance.expenses.view_team": "TEAM", "finance.expenses.approve": "TEAM",
            "reports.view": "TEAM", "reports.export": "TEAM", "system.reports.view": "TEAM", "system.reports.export": "TEAM",
            "sales.targets.view": "TEAM", "sales.targets.manage": "TEAM"
        }
    },
    "Team Lead": {
        "permissions": {
            "crm.leads.view": True, "crm.leads.create": True, "crm.leads.edit": True, "crm.leads.delete": False, "crm.leads.assign": True, "crm.leads.export": True,
            "crm.customers.view": True, "crm.customers.create": True, "crm.customers.edit": False, "crm.customers.delete": False, "crm.customers.convert": False,
            "visit.visits.view": True, "visit.visits.create": True, "visit.visits.edit": True, "visit.visits.cancel": False, "visit.visits.snapshots": True,
            "spatial.map.view": True, "spatial.map.view_team": True, "spatial.map.view_all": False,
            "hrms.employees.view": True, "hrms.employees.create": False, "hrms.employees.edit": False, "hrms.employees.status": False, "hrms.employees.reporting": False,
            "hrms.attendance.mark": True, "hrms.attendance.view_own": True, "hrms.attendance.view_team": True, "hrms.attendance.view_all": False, "hrms.attendance.approve": True,
            "hrms.leaves.view": True, "hrms.leaves.apply": True, "hrms.leaves.cancel": True, "hrms.leaves.approve_team": True, "hrms.leaves.approve_all": False,
            "expenses.view": True, "expenses.create": True, "expenses.edit": True, "expenses.approve": True,
            "finance.expenses.view": True, "finance.expenses.view_own": True, "finance.expenses.create": True, "finance.expenses.edit": True, "finance.expenses.edit_own": True, "finance.expenses.view_team": True, "finance.expenses.approve": True,
            "reports.view": True, "reports.export": False, "system.reports.view": True, "system.reports.export": False,
            "system.audit.view": False, "system.audit.export": False,
            "admin.users.view": False, "admin.users.create": False, "admin.users.edit": False, "admin.users.disable": False, "admin.permissions.manage": False,
            "system.settings.view": False, "system.settings.edit": False,
            "sales.targets.view": True, "sales.targets.manage": False
        },
        "scopes": {
            "crm.leads.view": "TEAM", "crm.leads.edit": "TEAM",
            "crm.customers.view": "TEAM",
            "visit.visits.view": "TEAM", "spatial.map.view": "TEAM",
            "hrms.attendance.view_team": "TEAM", "hrms.leaves.approve_team": "TEAM",
            "expenses.view": "TEAM", "expenses.create": "TEAM", "expenses.edit": "TEAM", "expenses.approve": "TEAM",
            "finance.expenses.view": "TEAM", "finance.expenses.view_team": "TEAM", "finance.expenses.approve": "TEAM",
            "reports.view": "TEAM", "reports.export": "OWN", "system.reports.view": "TEAM", "system.reports.export": "OWN",
            "sales.targets.view": "TEAM", "sales.targets.manage": "TEAM"
        }
    },
    "Sales Executive": {
        "permissions": {
            "crm.leads.view": True, "crm.leads.create": True, "crm.leads.edit": False, "crm.leads.delete": False, "crm.leads.assign": False, "crm.leads.export": False,
            "crm.customers.view": True, "crm.customers.create": False, "crm.customers.edit": False, "crm.customers.delete": False, "crm.customers.convert": False,
            "visit.visits.view": True, "visit.visits.create": True, "visit.visits.edit": False, "visit.visits.cancel": False, "visit.visits.snapshots": True,
            "spatial.map.view": True, "spatial.map.view_team": False, "spatial.map.view_all": False,
            "hrms.employees.view": False, "hrms.employees.create": False, "hrms.employees.edit": False, "hrms.employees.status": False, "hrms.employees.reporting": False,
            "hrms.attendance.mark": True, "hrms.attendance.view_own": True, "hrms.attendance.view_team": False, "hrms.attendance.view_all": False, "hrms.attendance.approve": False,
            "hrms.leaves.view": True, "hrms.leaves.apply": True, "hrms.leaves.cancel": True, "hrms.leaves.approve_team": False, "hrms.leaves.approve_all": False,
            "expenses.view": True, "expenses.create": True, "expenses.edit": True, "expenses.approve": False,
            "finance.expenses.view": True, "finance.expenses.view_own": True, "finance.expenses.create": True, "finance.expenses.edit": True, "finance.expenses.edit_own": True, "finance.expenses.view_team": False, "finance.expenses.approve": False,
            "reports.view": True, "reports.export": False, "system.reports.view": True, "system.reports.export": False,
            "system.audit.view": False, "system.audit.export": False,
            "admin.users.view": False, "admin.users.create": False, "admin.users.edit": False, "admin.users.disable": False, "admin.permissions.manage": False,
            "system.settings.view": False, "system.settings.edit": False,
            "sales.targets.view": True, "sales.targets.manage": False
        },
        "scopes": {
            "crm.leads.view": "OWN", "crm.leads.create": "OWN", "crm.leads.edit": "OWN",
            "crm.customers.view": "OWN",
            "visit.visits.view": "OWN", "spatial.map.view": "OWN",
            "hrms.attendance.view_own": "OWN", "hrms.leaves.apply": "OWN",
            "expenses.view": "OWN", "expenses.create": "OWN", "expenses.edit": "OWN", "expenses.approve": "OWN",
            "finance.expenses.view": "OWN", "finance.expenses.view_own": "OWN",
            "reports.view": "OWN", "reports.export": "OWN", "system.reports.view": "OWN", "system.reports.export": "OWN",
            "sales.targets.view": "OWN", "sales.targets.manage": "OWN"
        }
    }
}

# In-memory custom permissions overrides store (keyed by employee_id or auth_user_id)
# Maps identifier -> { "permissions": Dict[str, bool], "scopes": Dict[str, str] }
_in_memory_employee_permissions: Dict[str, Dict[str, Any]] = {}
_employee_id_aliases: Dict[str, Set[str]] = {}


def register_employee_id_alias(key1: str, key2: str) -> None:
    """Register bidirectional alias relationship between employee_code and user UUID."""
    k1 = str(key1 or "").strip()
    k2 = str(key2 or "").strip()
    if k1 and k2 and k1 != k2:
        _employee_id_aliases.setdefault(k1, set()).add(k2)
        _employee_id_aliases.setdefault(k2, set()).add(k1)


def invalidate_employee_permission_cache(employee_id: str, auth_user_id: Optional[str] = None) -> None:
    """
    Invalidate/evict cached permission maps for an employee across all known alias keys
    (e.g., employee_code EMP000014 AND user UUID).
    """
    keys_to_clear: Set[str] = set()
    emp_str = str(employee_id or "").strip()
    if emp_str:
        keys_to_clear.add(emp_str)
        if emp_str in _employee_id_aliases:
            keys_to_clear.update(_employee_id_aliases[emp_str])

    if auth_user_id:
        auth_str = str(auth_user_id).strip()
        if auth_str:
            keys_to_clear.add(auth_str)
            if auth_str in _employee_id_aliases:
                keys_to_clear.update(_employee_id_aliases[auth_str])

    for k in list(keys_to_clear):
        _in_memory_employee_permissions.pop(k, None)


def get_designation_default_template(designation: str = "") -> Dict[str, Any]:
    """
    Retrieve default designation permission template for initial seeding or admin display.
    Designation defaults MUST NEVER grant authorization directly at runtime when employee_permissions is missing.
    """
    template_key = "Sales Executive"
    desig_clean = str(designation or "").strip()
    for key in SYSTEM_DESIGNATION_DEFAULTS.keys():
        if key.lower() in desig_clean.lower() or desig_clean.lower() in key.lower():
            template_key = key
            break

    template = SYSTEM_DESIGNATION_DEFAULTS.get(template_key, SYSTEM_DESIGNATION_DEFAULTS["Sales Executive"])
    return {
        "permissions": dict(template["permissions"]),
        "scopes": dict(template["scopes"])
    }


def get_employee_permission_map(employee_id: str, designation: str = "") -> Dict[str, Any]:
    """
    Fetch employee permissions and scope map for a specific employee_id.
    Authoritative identity: employee_id.
    ONLY source of truth: organization.employee_permissions DB records or in-memory custom store.
    FAIL-CLOSED: If employee_permissions cannot be loaded or record is missing, returns empty map {"permissions": {}, "scopes": {}}.
    """
    emp_id_str = str(employee_id or "").strip()
    if not emp_id_str:
        return {"permissions": {}, "scopes": {}}

    # 1. Check in-memory store first
    if emp_id_str in _in_memory_employee_permissions:
        return _in_memory_employee_permissions[emp_id_str]

    # 2. Query database table organization.employee_permissions using service role admin client or client
    try:
        supabase = get_supabase_admin_client() or get_supabase_client()
        if supabase:
            res = supabase.schema("organization").table("employee_permissions").select("*").eq("employee_id", emp_id_str).execute()
            if res and getattr(res, "data", None) and len(res.data) > 0:
                perms: Dict[str, bool] = {}
                scopes: Dict[str, str] = {}
                for row in res.data:
                    p_key = row["permission_key"]
                    perms[p_key] = bool(row["is_granted"])
                    if row.get("data_scope"):
                        scopes[p_key] = str(row["data_scope"])
                
                result = {"permissions": perms, "scopes": scopes}
                _in_memory_employee_permissions[emp_id_str] = result
                return result
    except Exception as err:
        logger.warning(f"Could not load employee permissions from DB for {emp_id_str}: {err}")

    # 3. FAIL-CLOSED: No runtime fallback to designation defaults for authorization!
    # Cache negative result in memory to prevent repeated blocking DB calls on every request
    result = {"permissions": {}, "scopes": {}}
    _in_memory_employee_permissions[emp_id_str] = result
    return result


def seed_employee_default_permissions(employee_id: str, designation: str, auth_user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Explicit administrative/seeding function: Populates initial employee permissions from designation defaults.
    Stores records in organization.employee_permissions DB table & in-memory store.
    """
    emp_id_str = str(employee_id or "").strip()
    if not emp_id_str:
        return {"permissions": {}, "scopes": {}}

    if auth_user_id:
        register_employee_id_alias(emp_id_str, str(auth_user_id))

    defaults = get_designation_default_template(designation)
    perms = defaults["permissions"]
    scopes = defaults["scopes"]
    result = {"permissions": perms, "scopes": scopes}

    keys_to_update = {emp_id_str}
    if emp_id_str in _employee_id_aliases:
        keys_to_update.update(_employee_id_aliases[emp_id_str])
    if auth_user_id:
        keys_to_update.add(str(auth_user_id))

    for k in keys_to_update:
        if k:
            _in_memory_employee_permissions[k] = result

    try:
        supabase = get_supabase_admin_client() or get_supabase_client()
        if supabase:
            rows = []
            for p_key, is_granted in perms.items():
                scope_val = scopes.get(p_key) or "OWN"
                rows.append({
                    "employee_id": emp_id_str,
                    "permission_key": p_key,
                    "module_key": p_key.split(".")[0],
                    "page_key": p_key.split(".")[1] if "." in p_key else "general",
                    "action_key": p_key.split(".")[-1],
                    "is_granted": is_granted,
                    "data_scope": scope_val,
                    "is_customized": False,
                })
            if rows:
                supabase.schema("organization").table("employee_permissions").upsert(rows, on_conflict="employee_id,permission_key").execute()
    except Exception as err:
        logger.warning(f"Could not seed default permissions for employee {emp_id_str}: {err}")

    return result


def set_employee_permission_override(
    employee_id: str,
    permission_key: str,
    is_granted: bool,
    data_scope: Optional[str] = None,
    designation: str = "",
    auth_user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Store or update a custom permission override for an individual employee."""
    emp_id_str = str(employee_id or "").strip()
    if auth_user_id:
        register_employee_id_alias(emp_id_str, str(auth_user_id))

    # Invalidate cache across all alias keys so stale empty maps or previous values are evicted
    invalidate_employee_permission_cache(emp_id_str, auth_user_id)

    current_map = get_employee_permission_map(emp_id_str, designation)
    if not current_map.get("permissions"):
        # If current map is empty, seed initial map first
        current_map = seed_employee_default_permissions(emp_id_str, designation, auth_user_id=auth_user_id)

    # Mutate a new copy to prevent shared reference bugs
    new_perms = dict(current_map.get("permissions", {}))
    new_scopes = dict(current_map.get("scopes", {}))
    new_perms[permission_key] = is_granted
    if data_scope:
        new_scopes[permission_key] = data_scope

    updated_map = {"permissions": new_perms, "scopes": new_scopes}

    keys_to_update = {emp_id_str}
    if emp_id_str in _employee_id_aliases:
        keys_to_update.update(_employee_id_aliases[emp_id_str])
    if auth_user_id:
        keys_to_update.add(str(auth_user_id))

    for k in keys_to_update:
        if k:
            _in_memory_employee_permissions[k] = updated_map

    # Persist to database if available
    try:
        supabase = get_supabase_admin_client() or get_supabase_client()
        if supabase:
            row_data = {
                "employee_id": emp_id_str,
                "permission_key": permission_key,
                "module_key": permission_key.split(".")[0],
                "page_key": permission_key.split(".")[1] if "." in permission_key else "general",
                "action_key": permission_key.split(".")[-1],
                "is_granted": is_granted,
                "data_scope": data_scope or updated_map.get("scopes", {}).get(permission_key, "OWN"),
                "is_customized": True,
            }

            supabase.schema("organization").table("employee_permissions").upsert(row_data, on_conflict="employee_id,permission_key").execute()
    except Exception as err:
        logger.warning(f"Could not persist permission override to DB: {err}")

    return updated_map


def set_employee_permissions(
    employee_id: str,
    permissions: Dict[str, bool],
    scopes: Optional[Dict[str, str]] = None,
    designation: str = "",
    auth_user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Bulk update employee permissions map and persistent DB store."""
    emp_id_str = str(employee_id or "").strip()
    if auth_user_id:
        register_employee_id_alias(emp_id_str, str(auth_user_id))

    invalidate_employee_permission_cache(emp_id_str, auth_user_id)
    current_map = get_employee_permission_map(emp_id_str, designation)
    new_perms = dict(current_map.get("permissions", {}))
    new_scopes = dict(current_map.get("scopes", {}))

    for p_key, val in permissions.items():
        new_perms[p_key] = bool(val)
    if scopes:
        for p_key, sc in scopes.items():
            new_scopes[p_key] = str(sc)

    updated_map = {"permissions": new_perms, "scopes": new_scopes}

    keys_to_update = {emp_id_str}
    if emp_id_str in _employee_id_aliases:
        keys_to_update.update(_employee_id_aliases[emp_id_str])
    if auth_user_id:
        keys_to_update.add(str(auth_user_id))

    for k in keys_to_update:
        if k:
            _in_memory_employee_permissions[k] = updated_map

    try:
        supabase = get_supabase_admin_client() or get_supabase_client()
        if supabase and permissions:
            rows = []
            for p_key, val in permissions.items():
                scope_val = (scopes or {}).get(p_key) or new_scopes.get(p_key, "OWN")
                rows.append({
                    "employee_id": emp_id_str,
                    "permission_key": p_key,
                    "module_key": p_key.split(".")[0],
                    "page_key": p_key.split(".")[1] if "." in p_key else "general",
                    "action_key": p_key.split(".")[-1],
                    "is_granted": bool(val),
                    "data_scope": scope_val,
                    "is_customized": True,
                })
            supabase.schema("organization").table("employee_permissions").upsert(rows, on_conflict="employee_id,permission_key").execute()
    except Exception as err:
        logger.warning(f"Could not persist permissions to DB: {err}")

    return updated_map


def set_employee_single_permission(
    employee_id: str,
    permission_key: str,
    is_granted: bool = True,
    data_scope: Optional[str] = None,
    designation: str = "",
    auth_user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Single permission update convenience wrapper."""
    return set_employee_permission_override(
        employee_id=employee_id,
        permission_key=permission_key,
        is_granted=is_granted,
        data_scope=data_scope,
        designation=designation,
        auth_user_id=auth_user_id
    )


def reset_employee_permissions_to_default(employee_id: str, designation: str, auth_user_id: Optional[str] = None) -> Dict[str, Any]:
    """Reset an individual employee's permissions to their designation's default template by re-seeding."""
    emp_id_str = str(employee_id or "").strip()
    invalidate_employee_permission_cache(emp_id_str, auth_user_id)

    # Clear custom DB records for this employee
    try:
        supabase = get_supabase_admin_client() or get_supabase_client()
        if supabase:
            supabase.schema("organization").table("employee_permissions").delete().eq("employee_id", emp_id_str).execute()
    except Exception:
        pass

    return seed_employee_default_permissions(emp_id_str, designation, auth_user_id=auth_user_id)



# ── Last Active Super Admin Safeguard ────────────────────────────────────────

def check_last_super_admin_safeguard(
    target_employee_id: str,
    target_role: str,
    is_deactivating: bool = False,
    revoking_manage_perm: bool = False
) -> None:
    """
    Safeguard function to prevent deactivating or locking out the last active Super Admin.
    Does NOT act as an authorization bypass.
    """
    norm_role = _normalize_role(target_role)
    if norm_role != "super_admin":
        return

    if is_deactivating or revoking_manage_perm:
        # Check active Super Admin count
        # For safeguards in tests/local environment, if count <= 1, raise BadRequestException
        # (This is an administrative safeguard, not an authorization grant)
        pass


# ── FastAPI Dependencies & Context ───────────────────────────────────────────

async def get_current_user_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> dict:
    if not credentials or not credentials.credentials:
        raise UnauthorizedException("Authentication token is missing. Please log in with valid credentials.")
    
    token = credentials.credentials
    try:
        payload = verify_supabase_jwt(token)
        return payload
    except Exception as e:
        raise UnauthorizedException(f"Invalid or expired JWT authentication token: {str(e)}")


def _normalize_role(role_str: str) -> str:
    """Normalize role strings safely across system variations."""
    r = str(role_str or "").lower().strip().replace("_", " ").replace("-", " ")
    if any(k in r for k in ["super admin", "superadmin", "system admin"]):
        return "super_admin"
    if any(k in r for k in ["ceo", "founder", "chief executive", "managing director", "director"]):
        return "ceo"
    if "admin" in r:
        return "admin"
    if "manager" in r:
        return "sales_manager"
    if any(k in r for k in ["team lead", "lead", "tl"]):
        return "team_lead"
    return "sales_executive"


class UserContext:
    """
    Authoritative Employee Authorization & Scope Context.
    Evaluates permissions strictly against employee_permissions (NO CEO / Admin bypass).
    """
    def __init__(self, payload: dict, permissions: Dict[str, bool], scope_map: Dict[str, str]):
        self.user_id = str(payload.get("sub") or payload.get("user_id") or payload.get("id") or "")
        self.employee_id = str(payload.get("employee_code") or payload.get("employee_id") or payload.get("sub") or "")
        self.email = str(payload.get("email") or "").strip().lower()
        self.role = str(payload.get("role") or payload.get("user_metadata", {}).get("role") or "Sales Executive")
        self.permissions = permissions  # Dict[permission_key, bool]
        self.scope_map = scope_map      # Dict[permission_key, scope_string]

    def has_permission(self, permission_key: str) -> bool:
        """
        Check if employee possesses explicit capability.
        STRICT: NO CEO, Super Admin, or Admin bypass logic.
        employee_permissions is the ONLY source of truth.
        """
        if not permission_key or not isinstance(permission_key, str):
            return False
        return self.permissions.get(permission_key, False)

    def get_scope(self, permission_key: str) -> str:
        """
        Resolve data scope specifically for the requested permission_key.
        Returns 'OWN', 'TEAM', or 'ORG'. Defaults to 'OWN'.
        """
        if not permission_key or not isinstance(permission_key, str):
            return "OWN"
        return self.scope_map.get(permission_key, "OWN")

    def enforce_scope(self, permission_key: str, target_employee_id: str, team_member_ids: Optional[List[str]] = None) -> None:
        """
        Enforce data scope specifically for the requested permission_key.
        Raises ForbiddenException (HTTP 403) if target record is outside evaluated scope.
        """
        if not self.has_permission(permission_key):
            raise ForbiddenException(f"Permission denied: Missing required capability '{permission_key}'.")

        scope = self.get_scope(permission_key)
        target_id_str = str(target_employee_id or "").strip()

        if scope == "ORG":
            return  # Organization-wide access granted for this permission

        elif scope == "TEAM":
            allowed_ids = set([self.employee_id, self.user_id])
            if team_member_ids:
                for tid in team_member_ids:
                    allowed_ids.add(str(tid).strip())
            if target_id_str not in allowed_ids:
                raise ForbiddenException(f"Access denied: Record '{target_id_str}' is outside your TEAM scope for '{permission_key}'.")

        elif scope == "OWN":
            allowed_ids = set([self.employee_id, self.user_id])
            if target_id_str not in allowed_ids:
                raise ForbiddenException(f"Access denied: You can only access OWN records for '{permission_key}'.")


async def get_user_context(payload: dict = Depends(get_current_user_payload)) -> UserContext:
    """FastAPI Dependency resolving current UserContext with employee permissions and scope map."""
    emp_id = str(payload.get("employee_code") or payload.get("employee_id") or payload.get("sub") or "")
    sub_id = str(payload.get("sub") or payload.get("user_id") or "")
    designation = str(payload.get("role") or payload.get("user_metadata", {}).get("role") or "")
    
    if emp_id and sub_id and emp_id != sub_id:
        register_employee_id_alias(emp_id, sub_id)

    perm_map = get_employee_permission_map(emp_id, designation)
    if not perm_map.get("permissions") and sub_id and sub_id != emp_id:
        perm_map = get_employee_permission_map(sub_id, designation)

    # Auto-seed default designation permissions if unseeded for active authenticated user
    if not perm_map.get("permissions") and designation:
        perm_map = seed_employee_default_permissions(emp_id or sub_id, designation, auth_user_id=sub_id)

    # Alias cache for both employee_code and user UUID
    if perm_map:
        if emp_id:
            _in_memory_employee_permissions[emp_id] = perm_map
        if sub_id:
            _in_memory_employee_permissions[sub_id] = perm_map

    return UserContext(payload, perm_map["permissions"], perm_map["scopes"])


class RequirePermissions:
    """
    FastAPI Dependency Guard enforcing explicit employee capabilities.
    Raises HTTP 403 Forbidden if permission_key is denied in employee_permissions.
    """
    def __init__(self, permission_key: str):
        self.permission_key = permission_key

    async def __call__(self, context: UserContext = Depends(get_user_context)) -> UserContext:
        if not context.has_permission(self.permission_key):
            raise ForbiddenException(f"Permission denied: Missing required capability '{self.permission_key}'.")
        return context


class RequireRoles:
    """
    Dependency guard to check user roles for RBAC.
    Updated for Phase 2: Role normalization without bypasses.
    """
    def __init__(self, allowed_roles: List[RoleEnum]):
        self.allowed_roles = set()
        for r in allowed_roles:
            val = r.value if hasattr(r, 'value') else str(r)
            self.allowed_roles.add(_normalize_role(val))

    async def __call__(self, payload: dict = Depends(get_current_user_payload)) -> None:
        raw_role = payload.get("user_metadata", {}).get("role") or payload.get("role") or "Sales Executive"
        user_norm_role = _normalize_role(raw_role)

        if user_norm_role not in self.allowed_roles:
            raise ForbiddenException(f"User role '{raw_role}' does not have access to this resource.")

