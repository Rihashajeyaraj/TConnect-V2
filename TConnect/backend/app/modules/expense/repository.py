from typing import List, Optional, Dict, Any
from app.database.supabase import get_supabase_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_expenses: List[Dict[str, Any]] = []


class ExpenseRepository:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.helper = get_schema_helper()

    def get_all_expenses(self) -> List[Dict[str, Any]]:
        try:
            res = self.helper.table(SchemaEnum.EXPENSE, "claims").select("*").execute()
            if res.data is not None:
                return res.data
        except Exception:
            try:
                res = self.supabase.table("expenses").select("*").execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.warning(f"Using memory fallback for expenses: {e}")
        return _in_memory_expenses

    def create_expense(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["id"] = data.get("id") or f"exp_{len(_in_memory_expenses)+1:03d}"
        try:
            res = self.helper.table(SchemaEnum.EXPENSE, "claims").insert(data).execute()
            if res.data:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("expenses").insert(data).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Stored expense in memory fallback: {e}")

        _in_memory_expenses.append(data)
        return data

    def get_expense_by_id(self, exp_id: str) -> Optional[Dict[str, Any]]:
        expenses = self.get_all_expenses()
        for e in expenses:
            if str(e.get("id")) == str(exp_id):
                return e
        return None
