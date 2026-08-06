from typing import List, Dict, Any
from datetime import datetime
from app.modules.expense.repository import ExpenseRepository
from app.modules.expense.schemas import ExpenseCreate, ExpenseApproval
from app.exceptions.base import NotFoundException


class ExpenseService:
    def __init__(self, repo: ExpenseRepository = None):
        self.repo = repo or ExpenseRepository()

    def list_expenses(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        return self.repo.get_all_expenses(user_payload)

    def create_expense(self, data: ExpenseCreate, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        payload = data.model_dump()

        # Extract identity from JWT payload
        user_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "")
        user_email = str((user_payload or {}).get("email") or "").lower().strip()
        user_name = str((user_payload or {}).get("name") or (user_payload or {}).get("full_name") or "")
        user_emp_code = str((user_payload or {}).get("employee_code") or (user_payload or {}).get("employee_id") or "")
        user_phone = str((user_payload or {}).get("phone") or (user_payload or {}).get("mobile") or "")

        # Stamp employee identity onto payload
        payload["user_id"] = user_id
        payload["employee_id"] = payload.get("employee_id") or user_emp_code or user_id
        payload["employee_code"] = payload.get("employee_code") or user_emp_code
        payload["employee_name"] = payload.get("employee_name") or user_name
        payload["employee_phone"] = payload.get("employee_phone") or user_phone
        payload["assigned_to_email"] = user_email
        payload["status"] = "SUBMITTED"
        payload["submitted_date"] = datetime.utcnow().isoformat()

        return self.repo.create_expense(payload, user_payload)

    def update_expense_status(self, exp_id: str, approval: ExpenseApproval, manager_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        exp = self.repo.get_expense_by_id(exp_id)
        if not exp:
            raise NotFoundException(resource="Expense claim", identifier=exp_id)
        return self.repo.update_expense_status(exp_id, approval.status, approval.remarks or "", manager_payload)

    def get_manager_expenses(self, user_payload: Dict[str, Any] = None, params: Dict[str, Any] = None) -> Dict[str, Any]:
        return self.repo.get_manager_expenses(user_payload, params)

    def change_status(self, exp_id: str, status: str, remarks: str, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        return self.repo.update_expense_status(exp_id, status, remarks, user_payload)
