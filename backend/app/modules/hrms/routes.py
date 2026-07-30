from fastapi import APIRouter, Depends, status
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.hrms.schemas import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from app.modules.hrms.service import HRMSService
from app.modules.hrms.permissions import CanViewEmployees, CanManageEmployees

router = APIRouter(prefix="/hrms", tags=["HRMS"])


def get_service() -> HRMSService:
    return HRMSService()


@router.get("/employees", response_model=StandardResponse)
async def list_employees(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewEmployees),
    service: HRMSService = Depends(get_service)
):
    """List all employees in the organization."""
    employees = service.list_employees()
    return StandardResponse.success_response(
        data=employees,
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
    """Get employee details by ID."""
    emp = service.get_employee(emp_id)
    return StandardResponse.success_response(
        data=emp,
        message="Employee details retrieved successfully"
    )
