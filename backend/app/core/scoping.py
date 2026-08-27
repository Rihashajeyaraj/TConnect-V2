from typing import Dict, Any, Optional, Set
from app.modules.users.repository import UserRepository
from app.exceptions.base import ForbiddenException
from app.core.logger import logger


def normalize_user_role(role_str: str) -> str:
    """Normalize role strings safely across system variations."""
    r = str(role_str or "").lower().strip().replace("_", " ").replace("-", " ")
    if any(k in r for k in ["super admin", "superadmin", "system admin"]):
        return "super_admin"
    if any(k in r for k in ["ceo", "founder", "chief executive", "managing director", "director"]):
        return "ceo"
    if "admin" in r:
        return "admin"
    if any(k in r for k in ["manager", "team lead", "tl", "lead"]):
        return "sales_manager"
    return "sales_executive"


def get_allowed_user_identifiers(user_payload: Dict[str, Any] = None) -> Optional[Dict[str, Set[str]]]:
    """
    Centralized data access scoping resolver.
    
    Returns:
      - None: Admin / Super Admin / CEO -> Unrestricted access to ALL records in organization.
      - Dict with sets of allowed 'emails', 'codes', 'ids', 'names':
          - Sales Manager: Allowed to view records belonging to themselves AND any assigned Sales Executive.
          - Sales Executive: Allowed to view ONLY their own records.
    """
    if not user_payload:
        return None

    user_id = str(user_payload.get("sub") or user_payload.get("user_id") or "").strip()
    user_email = str(user_payload.get("email") or "").lower().strip()
    user_role = str(user_payload.get("role") or "").strip()
    user_emp_code = str(user_payload.get("employee_code") or user_payload.get("employee_id") or "").strip()

    norm_role = normalize_user_role(user_role)

    # 1. Admin / Super Admin / CEO -> Unrestricted Organization Access
    if norm_role in ("super_admin", "ceo", "admin"):
        return None

    # Base allowed sets (always includes the logged-in user's own credentials)
    allowed_emails: Set[str] = {user_email} if user_email else set()
    allowed_codes: Set[str] = {user_emp_code} if user_emp_code else set()
    allowed_ids: Set[str] = {user_id} if user_id else set()
    allowed_names: Set[str] = set()

    # Extract user's name if present in token
    meta = user_payload.get("user_metadata") or {}
    user_name = str(meta.get("full_name") or user_payload.get("name") or "").lower().strip()
    if user_name:
        allowed_names.add(user_name)

    # 2. Sales Manager -> Include assigned Sales Executives
    if norm_role == "sales_manager":
        try:
            repo = UserRepository()
            all_users = repo.get_all_users()

            def collect_subordinates(manager_ids: Set[str], manager_emails: Set[str], manager_codes: Set[str]) -> bool:
                found_new = False
                for u in all_users:
                    exec_email = str(u.get("email") or "").lower().strip()
                    exec_code = str(u.get("employee_code") or u.get("employee_id") or "").strip()
                    exec_id = str(u.get("id") or u.get("auth_user_id") or u.get("user_id") or "").strip()

                    # Skip if already in the allowed sets
                    if (exec_id and exec_id in manager_ids) or (exec_email and exec_email in manager_emails) or (exec_code and exec_code in manager_codes):
                        continue

                    r_id = str(u.get("reporting_manager_id") or u.get("reporting_manager") or "").strip()
                    r_email = str(u.get("reporting_manager_email") or "").lower().strip()

                    is_assigned = (
                        (r_id and r_id in manager_ids)
                        or (r_email and r_email in manager_emails)
                        or (r_id and r_id in manager_codes)
                    )

                    if is_assigned:
                        exec_name = str(u.get("name") or u.get("full_name") or "").lower().strip()
                        if exec_email:
                            manager_emails.add(exec_email)
                        if exec_code:
                            manager_codes.add(exec_code)
                        if exec_id:
                            manager_ids.add(exec_id)
                        if exec_name:
                            allowed_names.add(exec_name)
                        found_new = True
                return found_new

            # Keep collecting down the hierarchy tree until no more subordinates are found
            while collect_subordinates(allowed_ids, allowed_emails, allowed_codes):
                pass

        except Exception as e:
            logger.warning(f"Error resolving manager assigned team recursively: {e}")

    return {
        "emails": allowed_emails,
        "codes": allowed_codes,
        "ids": allowed_ids,
        "names": allowed_names,
    }


def is_record_accessible(item: Dict[str, Any], allowed: Optional[Dict[str, Set[str]]]) -> bool:
    """
    Check if a data record matches the allowed user identifiers.
    If allowed is None, record is universally accessible (Admin/CEO mode).
    """
    if allowed is None or not isinstance(item, dict):
        return True

    allowed_emails = allowed.get("emails", set())
    allowed_codes = allowed.get("codes", set())
    allowed_ids = allowed.get("ids", set())
    allowed_names = allowed.get("names", set())

    # Extract all emails on record (assigned, creator, employee, reporting manager)
    emails_to_check = {
        str(item.get("assigned_to_email") or "").lower().strip(),
        str(item.get("assignedToEmail") or "").lower().strip(),
        str(item.get("executive_email") or "").lower().strip(),
        str(item.get("executiveEmail") or "").lower().strip(),
        str(item.get("employee_email") or "").lower().strip(),
        str(item.get("email") or "").lower().strip(),
        str(item.get("owner_email") or "").lower().strip(),
        str(item.get("created_by_email") or "").lower().strip(),
        str(item.get("reporting_manager_email") or "").lower().strip(),
    } - {""}

    # Extract IDs / Codes on record.
    # IMPORTANT: created_by and assigned_to are Supabase auth UUIDs — they must be
    # compared against allowed_ids (not just allowed_codes). We include them in
    # codes_to_check because that set is tested against BOTH allowed_codes AND allowed_ids.
    codes_to_check = {
        str(item.get("employee_id") or "").strip(),
        str(item.get("employee_code") or "").strip(),
        str(item.get("emp_code") or "").strip(),
        str(item.get("visitor_id") or "").strip(),
        str(item.get("user_id") or "").strip(),
        str(item.get("created_by") or "").strip(),   # auth UUID — checked vs allowed_ids below
        str(item.get("assigned_to") or "").strip(),  # auth UUID — checked vs allowed_ids below
        str(item.get("reporting_manager_id") or "").strip(),
    } - {""}

    # Extract Names on record
    names_to_check = {
        str(item.get("assigned_to_name") or "").lower().strip(),
        str(item.get("assignedTo") or "").lower().strip(),
        str(item.get("executive") or "").lower().strip(),
        str(item.get("executiveName") or "").lower().strip(),
        str(item.get("employee_name") or "").lower().strip(),
        str(item.get("created_by_name") or "").lower().strip(),
        str(item.get("reporting_manager_name") or "").lower().strip(),
        str(item.get("sales_executive") or "").lower().strip(),
        str(item.get("sales_manager") or "").lower().strip(),
    } - {""}

    # Parse metadata tags embedded in notes/description (e.g. "Email: xyz | EMP: 123")
    notes_raw = str(item.get("notes") or item.get("description") or item.get("remarks") or "")
    if notes_raw and "|" in notes_raw:
        for part in notes_raw.split("|"):
            p_strip = part.strip()
            if "Email:" in p_strip:
                emails_to_check.add(p_strip.split("Email:")[-1].strip().lower())
            elif "EMP:" in p_strip:
                codes_to_check.add(p_strip.split("EMP:")[-1].strip())
            elif "Manager:" in p_strip:
                emails_to_check.add(p_strip.split("Manager:")[-1].strip().lower())
            elif "AssignedTo:" in p_strip:
                names_to_check.add(p_strip.split("AssignedTo:")[-1].strip().lower())

    # Check Email match
    for email in emails_to_check:
        if email in allowed_emails:
            return True

    # Check Code / ID match (codes_to_check includes auth UUIDs, so check against allowed_ids too)
    for code in codes_to_check:
        if code in allowed_codes or code in allowed_ids:
            return True

    # Check Name match
    for name in names_to_check:
        if name in allowed_names or any(an in name for an in allowed_names if len(an) >= 3):
            return True

    # Fallback: If item has no identifiable owner metadata at all, allow access so newly created records don't vanish
    if not emails_to_check and not codes_to_check and not names_to_check:
        return True

    return False


def enforce_record_access(item: Dict[str, Any], user_payload: Dict[str, Any], resource_name: str = "resource") -> None:
    """
    Enforces authorization on a single record.
    Raises ForbiddenException (HTTP 403) if the logged-in user does NOT have permission.
    """
    allowed = get_allowed_user_identifiers(user_payload)
    if not is_record_accessible(item, allowed):
        raise ForbiddenException(f"You do not have permission to access or modify this {resource_name}.")
