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
    """Update employee profile."""
    current_emp_code = str(user_payload.get("employee_code") or user_payload.get("employee_id") or "").strip()
    current_user_id = str(user_payload.get("sub") or user_payload.get("user_id") or "").strip()
    user_role = normalize_user_role(user_payload.get("role") or user_payload.get("user_metadata", {}).get("role"))

    is_self = (emp_id == current_emp_code or emp_id == current_user_id)

    if not is_self:
        if user_role not in ("admin", "super_admin", "ceo"):
            raise HTTPException(status_code=403, detail="Not authorized to manage other employees' profiles")
    elif user_role not in ("admin", "super_admin", "ceo"):
        # Regular employee is updating self. Protect company-controlled fields.
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

    updated = service.update_employee(emp_id, data)
    update_dict = data.model_dump(exclude_none=True)
    status_val = str(update_dict.get("status") or "").lower()
    if "role" in update_dict:
        action = "EMPLOYEE_ROLE_CHANGED"
    elif status_val in ("inactive", "deactivated", "terminated", "disabled"):
        action = "EMPLOYEE_DEACTIVATED"
    else:
        action = "EMPLOYEE_UPDATED"
    create_audit_log(
        action, "hrms.employees", user_payload,
        entity_id=emp_id, module="HRMS",
        description=f"Employee {action.lower().replace('_', ' ')}: {emp_id}",
        new_value={k: v for k, v in update_dict.items() if k in ("role", "status", "department", "reporting_manager")},
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
