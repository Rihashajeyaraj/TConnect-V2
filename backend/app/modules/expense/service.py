from typing import List, Dict, Any
from app.modules.expense.repository import ExpenseRepository
from app.modules.expense.schemas import ExpenseCreate, ExpenseApproval
from app.exceptions.base import NotFoundException


class ExpenseService:
    def __init__(self, repo: ExpenseRepository = None):
        self.repo = repo or ExpenseRepository()

    def list_expenses(self) -> List[Dict[str, Any]]:
        return self.repo.get_all_expenses()

    def create_expense(self, data: ExpenseCreate, user_id: str) -> Dict[str, Any]:
        payload = data.model_dump()
        payload["user_id"] = user_id
        payload["status"] = "SUBMITTED"
        return self.repo.create_expense(payload)

    def update_expense_status(self, exp_id: str, approval: ExpenseApproval) -> Dict[str, Any]:
        exp = self.repo.get_expense_by_id(exp_id)
        if not exp:
            raise NotFoundException(resource="Expense claim", identifier=exp_id)
        exp["status"] = approval.status
        if approval.remarks:
            exp["remarks"] = approval.remarks
        return exp
