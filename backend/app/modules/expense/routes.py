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
    """Retrieve all submitted expense claims."""
    expenses = service.list_expenses()
    return StandardResponse.success_response(
        data=expenses,
        message="Expenses list retrieved successfully"
    )


@router.post("", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: ExpenseCreate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewExpenses),
    service: ExpenseService = Depends(get_service)
):
    """Submit a new expense claim."""
    user_id = user_payload.get("sub", "user_001")
    exp = service.create_expense(data, user_id)
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
    """Approve or reject an expense claim."""
    exp = service.update_expense_status(exp_id, approval)
    return StandardResponse.success_response(
        data=exp,
        message=f"Expense claim {approval.status.lower()} successfully"
    )
