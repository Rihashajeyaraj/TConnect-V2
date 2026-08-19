from fastapi import APIRouter, Depends, status, HTTPException
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.core.scoping import get_allowed_user_identifiers, is_record_accessible, normalize_user_role
from app.modules.hrms.schemas import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from app.modules.hrms.service import HRMSService
from app.modules.hrms.permissions import CanViewEmployees, CanManageEmployees
from app.modules.audit.service import create_audit_log

router = APIRouter(prefix="/hrms", tags=["HRMS"])


def get_service() -> HRMSService:
    return HRMSService()


# ── Helper: resolve the best lookup identifier for the current user ────────────
# When the JWT sub / user_id is a nil UUID (00000000-...) the DB lookup fails.
# We prefer employee_code (always stored in user_metadata), then the user_id,
# and finally the email — which is always present and reliably unique.
def _best_self_identifier(user_payload: dict) -> str:
    meta = user_payload.get("user_metadata") or {}

    emp_code = (
        meta.get("employee_code")
        or meta.get("employee_id")
        or user_payload.get("employee_code")
        or user_payload.get("employee_id")
    )
    if emp_code and not str(emp_code).startswith("EMP-"):
        # EMP-XXXX codes are synthetic (generated client-side) — skip them
        return str(emp_code).strip()

    user_id = (
        user_payload.get("sub")
        or user_payload.get("user_id")
        or meta.get("user_id")
        or meta.get("sub")
        or ""
    )
    # Nil UUID means the auth sub was not properly resolved — skip it
    if user_id and user_id != "00000000-0000-0000-0000-000000000001":
        return str(user_id).strip()

    # Fall back to email — always present in a valid JWT
    email = (
        user_payload.get("email")
        or meta.get("email")
        or ""
    ).lower().strip()
    return email


@router.get("/employees", response_model=StandardResponse)
async def list_employees(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewEmployees),
    service: HRMSService = Depends(get_service)
):
    """List employees in the organization, scoped by role and team hierarchy."""
    all_employees = service.list_employees()
    allowed = get_allowed_user_identifiers(user_payload)
    if allowed is not None:
        scoped_employees = [e for e in all_employees if is_record_accessible(e, allowed)]
    else:
        scoped_employees = all_employees

    return StandardResponse.success_response(
        data=scoped_employees,
        message="Employee list retrieved successfully"
    )


@router.post("/employees", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    data: EmployeeCreate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageEmployees),
    service: HRMSService = Depends(get_service)
):
    """Create a new employee profile."""
    emp = service.create_employee(data)
    create_audit_log(
        "EMPLOYEE_CREATED", "hrms.employees", user_payload,
        entity_id=str(emp.get("employee_id") or emp.get("id") or ""),
        module="HRMS",
        description=f"Employee created: {data.name or data.employee_code or ''}",
        new_value={"name": data.name, "role": data.role, "email": data.email, "employee_code": data.employee_code},
    )
    return StandardResponse.success_response(
        data=emp,
        message="Employee created successfully"
    )


@router.get("/employees/{emp_id}", response_model=StandardResponse)
async def get_employee(
    emp_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewEmployees),
    service: HRMSService = Depends(get_service)
):
    """Get employee details by ID with role-scoped access control."""
    current_emp_code = str(
        user_payload.get("employee_code")
        or user_payload.get("employee_id")
        or user_payload.get("user_metadata", {}).get("employee_code")
        or user_payload.get("user_metadata", {}).get("employee_id")
        or ""
    ).strip()
    current_user_id = str(
        user_payload.get("sub")
        or user_payload.get("user_id")
        or user_payload.get("user_metadata", {}).get("user_id")
        or user_payload.get("user_metadata", {}).get("sub")
        or ""
    ).strip()

    if emp_id == current_emp_code or emp_id.lower() == "self" or emp_id == current_user_id:
        emp_id = _best_self_identifier(user_payload)

    allowed = get_allowed_user_identifiers(user_payload)
    emp = service.get_employee(emp_id)
    if allowed is not None and emp:
        if not is_record_accessible(emp, allowed):
            from app.exceptions.base import ForbiddenException
            raise ForbiddenException("You do not have permission to view this employee profile.")

    return StandardResponse.success_response(
        data=emp,
        message="Employee details retrieved successfully"
    )


@router.put("/employees/{emp_id}", response_model=StandardResponse)
async def update_employee(
    emp_id: str,
    data: EmployeeUpdate,
    user_payload: dict = Depends(get_current_user_payload),
    service: HRMSService = Depends(get_service)
):
    """Update employee profile with change-diff audit logging."""
    current_emp_code = str(
        user_payload.get("employee_code") 
        or user_payload.get("employee_id") 
        or user_payload.get("user_metadata", {}).get("employee_code")
        or user_payload.get("user_metadata", {}).get("employee_id")
        or ""
    ).strip()
    current_user_id = str(
        user_payload.get("sub") 
        or user_payload.get("user_id") 
        or user_payload.get("user_metadata", {}).get("user_id")
        or user_payload.get("user_metadata", {}).get("sub")
        or ""
    ).strip()
    user_role = normalize_user_role(user_payload.get("role") or user_payload.get("user_metadata", {}).get("role"))

    is_self = (
        emp_id == current_emp_code
        or emp_id == current_user_id
        or emp_id.lower() == "self"
    )
    if is_self:
        emp_id = _best_self_identifier(user_payload)

    # ── Permission guard ────────────────────────────────────────────────────
    if not is_self:
        if user_role not in ("admin", "super_admin", "ceo"):
            raise HTTPException(status_code=403, detail="Not authorized to manage other employees' profiles")
    elif user_role not in ("admin", "super_admin", "ceo"):
        # Regular / manager employee editing self — strip company-controlled fields
        unset_fields = data.model_dump(exclude_unset=True)
        admin_fields = {
            "department", "designation", "role", "is_active", "status",
            "employee_code", "email", "joining_date", "reporting_manager",
            "reporting_manager_id", "reporting_manager_name", "reporting_manager_email"
        }
        modified_admin_fields = admin_fields.intersection(unset_fields.keys())
        if modified_admin_fields:
            raise HTTPException(
                status_code=403,
                detail=f"Employees are not permitted to modify company-controlled fields: {', '.join(modified_admin_fields)}"
            )

    # ── Read existing employee BEFORE update (needed for diff + audit) ──────
    existing = service.get_employee(emp_id)

    # ── Build submitted payload (only fields the caller actually sent) ───────
    submitted = data.model_dump(exclude_unset=True)

    # ── Compute changed fields ───────────────────────────────────────────────
    # Map EmployeeUpdate field names to the keys returned by get_employee.
    # Some frontend fields alias DB column names differently.
    _FIELD_ALIAS: dict = {
        "mobile": "phone",           # mobile mirrors phone in the DB
    }
    changed_fields: dict = {}
    if existing:
        for field, new_val in submitted.items():
            db_key = _FIELD_ALIAS.get(field, field)
            old_val = existing.get(db_key) or existing.get(field)
            # Normalise to str for comparison (avoids None vs "" false positives)
            old_str = str(old_val).strip() if old_val is not None else ""
            new_str = str(new_val).strip() if new_val is not None else ""
            if old_str != new_str:
                changed_fields[field] = {"old": old_val, "new": new_val}

    # Skip DB write and audit when nothing actually changed
    if not changed_fields:
        return StandardResponse.success_response(
            data=existing or {},
            message="No changes detected — employee profile unchanged"
        )

    # ── Perform the update ───────────────────────────────────────────────────
    updated = service.update_employee(emp_id, data)

    # ── Deactivation hook to unassign Leads and Customers ──────────────────
    is_inactive_status = str(updated.get("status") or "").lower() in ("inactive", "deactivated", "terminated", "disabled")
    is_not_active = updated.get("is_active") is False
    if is_inactive_status or is_not_active:
        try:
            import logging
            log = logging.getLogger("TwiteConnect Backend")
            from app.modules.crm.service import CRMService
            CRMService().unassign_employee_records(updated)
        except Exception as e:
            import logging
            logging.getLogger("TwiteConnect Backend").warning(f"Deactivation unassign hook failed: {e}")

    # ── Build human-readable description ────────────────────────────────────
    emp_name = (
        (existing or {}).get("name")
        or f"{(existing or {}).get('first_name', '')} {(existing or {}).get('last_name', '')}".strip()
        or emp_id
    )
    emp_code = (existing or {}).get("employee_code") or emp_id
    changed_summary = ", ".join(changed_fields.keys())

    # ── Determine action label ───────────────────────────────────────────────
    update_dict = data.model_dump(exclude_none=True)
    if "role" in changed_fields:
        action = "EMPLOYEE_ROLE_CHANGED"
    elif str(update_dict.get("status") or "").lower() in ("inactive", "deactivated", "terminated", "disabled"):
        action = "EMPLOYEE_DEACTIVATED"
    else:
        action = "EMPLOYEE_PROFILE_UPDATED"

    # ── Create audit log (after successful update) ───────────────────────────
    create_audit_log(
        action,
        "hrms.employees",
        user_payload,
        entity_id=emp_code,
        module="HRMS",
        description=f"Employee profile updated: {emp_name} ({emp_code}) — changed: {changed_summary}",
        previous_value={f: v["old"] for f, v in changed_fields.items()},
        new_value={f: v["new"] for f, v in changed_fields.items()},
        details={
            "module": "HRMS",
            "resource": "employee_profile",
            "target_id": emp_code,
            "target_name": emp_name,
            "target_employee": emp_id,
            "employee_code": emp_code,
            "changed_fields": changed_fields,
            "changed_by_id": current_user_id,
            "changed_by_role": user_role,
            "is_self_update": is_self,
            "description": f"Profile fields updated: {changed_summary}",
        },
    )

    return StandardResponse.success_response(
        data=updated,
        message="Employee profile updated successfully"
    )


@router.delete("/employees/{emp_id}", response_model=StandardResponse)
async def delete_employee(
    emp_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageEmployees),
    service: HRMSService = Depends(get_service)
):
    """Delete employee profile."""
    service.delete_employee(emp_id)
    create_audit_log(
        "EMPLOYEE_DELETED", "hrms.employees", user_payload,
        entity_id=emp_id, module="HRMS",
        description=f"Employee {emp_id} deleted",
    )
    return StandardResponse.success_response(
        data={"deleted": True},
        message="Employee profile deleted successfully"
    )
