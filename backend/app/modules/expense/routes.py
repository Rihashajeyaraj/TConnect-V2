from fastapi import APIRouter, Depends, status
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.expense.schemas import ExpenseCreate, ExpenseApproval, ExpenseResponse
from app.modules.expense.service import ExpenseService
from app.modules.expense.permissions import CanViewExpenses, CanApproveExpenses

router = APIRouter(prefix="/expenses", tags=["Expense Management"])


def get_service() -> ExpenseService:
    return ExpenseService()


@router.get("", response_model=StandardResponse)
async def list_expenses(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewExpenses),
    service: ExpenseService = Depends(get_service)
):
    """Retrieve expense claims filtered by authenticated user."""
    expenses = service.list_expenses(user_payload)
    return StandardResponse.success_response(
        data=expenses,
        message="Expenses list retrieved successfully"
    )


@router.get("/manager", response_model=StandardResponse)
async def list_manager_expenses(
    manager_id: str = None,
    sales_executive_id: str = None,
    status: str = None,
    category: str = None,
    search: str = None,
    from_date: str = None,
    to_date: str = None,
    page: int = 1,
    limit: int = 50,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewExpenses),
    service: ExpenseService = Depends(get_service)
):
    """Retrieve team expense requests & summary metrics for logged-in Sales Manager."""
    params = {
        "manager_id": manager_id,
        "sales_executive_id": sales_executive_id,
        "status": status,
        "category": category,
        "search": search,
        "from_date": from_date,
        "to_date": to_date,
        "page": page,
        "limit": limit,
    }
    data = service.get_manager_expenses(user_payload, params)
    return StandardResponse.success_response(
        data=data,
        message="Manager team expenses retrieved successfully"
    )


@router.post("", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: ExpenseCreate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewExpenses),
    service: ExpenseService = Depends(get_service)
):
    """Submit a new expense claim."""
    exp = service.create_expense(data, user_payload)
    return StandardResponse.success_response(
        data=exp,
        message="Expense claim submitted successfully"
    )


@router.put("/{exp_id}/approval", response_model=StandardResponse)
async def approve_or_reject_expense(
    exp_id: str,
    approval: ExpenseApproval,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanApproveExpenses),
    service: ExpenseService = Depends(get_service)
):
    """Approve or reject an expense claim with authorization check."""
    exp = service.update_expense_status(exp_id, approval, user_payload)
    return StandardResponse.success_response(
        data=exp,
        message=f"Expense claim {approval.status.lower()} successfully"
    )


@router.patch("/{exp_id}/approve", response_model=StandardResponse)
async def approve_expense_patch(
    exp_id: str,
    data: dict = None,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanApproveExpenses),
    service: ExpenseService = Depends(get_service)
):
    """Approve an expense claim with authorization check."""
    remarks = (data or {}).get("remarks") or (data or {}).get("manager_remarks") or "Approved by Sales Manager."
    exp = service.change_status(exp_id, "APPROVED", remarks, user_payload)
    return StandardResponse.success_response(
        data=exp,
        message="Expense claim approved successfully"
    )


@router.patch("/{exp_id}/reject", response_model=StandardResponse)
async def reject_expense_patch(
    exp_id: str,
    data: dict = None,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanApproveExpenses),
    service: ExpenseService = Depends(get_service)
):
    """Reject an expense claim with authorization check."""
    remarks = (data or {}).get("remarks") or (data or {}).get("manager_remarks") or (data or {}).get("reason") or "Rejected by Sales Manager."
    exp = service.change_status(exp_id, "REJECTED", remarks, user_payload)
    return StandardResponse.success_response(
        data=exp,
        message="Expense claim rejected successfully"
    )


@router.patch("/{exp_id}/return", response_model=StandardResponse)
async def return_expense_patch(
    exp_id: str,
    data: dict = None,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanApproveExpenses),
    service: ExpenseService = Depends(get_service)
):
    """Return an expense claim for correction with authorization check."""
    remarks = (data or {}).get("remarks") or (data or {}).get("manager_remarks") or "Returned for correction."
    exp = service.change_status(exp_id, "RETURNED", remarks, user_payload)
    return StandardResponse.success_response(
        data=exp,
        message="Expense claim returned for correction successfully"
    )
