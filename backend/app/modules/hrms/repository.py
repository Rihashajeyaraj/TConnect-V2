from typing import List, Optional, Dict, Any
from app.database.supabase import get_supabase_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_employees: List[Dict[str, Any]] = []


class HRMSRepository:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.helper = get_schema_helper()

    def get_all_employees(self) -> List[Dict[str, Any]]:
        try:
            res = self.helper.table(SchemaEnum.HRMS, "employees").select("*").execute()
            if res.data is not None:
                return res.data
        except Exception:
            try:
                res = self.supabase.table("employees").select("*").execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.warning(f"Using memory fallback for employees list: {e}")
        return _in_memory_employees

    def create_employee(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["id"] = data.get("id") or f"emp_{len(_in_memory_employees)+1:03d}"
        try:
            res = self.helper.table(SchemaEnum.HRMS, "employees").insert(data).execute()
            if res.data:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("employees").insert(data).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Stored employee in memory fallback: {e}")

        _in_memory_employees.append(data)
        return data

    def get_employee_by_id(self, emp_id: str) -> Optional[Dict[str, Any]]:
        all_emp = self.get_all_employees()
        for emp in all_emp:
            if str(emp.get("id")) == str(emp_id) or emp.get("employee_code") == str(emp_id):
                return emp
        return None
