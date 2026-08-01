from typing import List, Optional, Dict, Any
from app.modules.hrms.repository import HRMSRepository
from app.modules.hrms.schemas import EmployeeCreate, EmployeeUpdate
from app.exceptions.base import NotFoundException


class HRMSService:
    def __init__(self, repo: Optional[HRMSRepository] = None):
        self.repo = repo or HRMSRepository()

    def list_employees(self) -> List[Dict[str, Any]]:
        return self.repo.get_all_employees()

    def create_employee(self, data: EmployeeCreate) -> Dict[str, Any]:
        payload = data.model_dump()
        return self.repo.create_employee(payload)

    def get_employee(self, emp_id: str) -> Dict[str, Any]:
        emp = self.repo.get_employee_by_id(emp_id)
        if not emp:
            raise NotFoundException(resource="Employee", identifier=emp_id)
        return emp

    def update_employee(self, emp_id: str, data: EmployeeUpdate) -> Dict[str, Any]:
        payload = data.model_dump(exclude_unset=True)
        return self.repo.update_employee(emp_id, payload)

    def delete_employee(self, emp_id: str) -> bool:
        """Delete employee from HRMS and Supabase Auth."""
        return self.repo.delete_employee(emp_id)
