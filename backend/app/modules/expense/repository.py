from typing import List, Optional, Dict, Any
import uuid
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger


class ExpenseRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
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
                logger.warning(f"Supabase expenses fetch notice: {e}")
        return []

    def create_expense(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["id"] = data.get("id") or str(uuid.uuid4())
        data["expense_id"] = data.get("expense_id") or data["id"]
        try:
            res = self.helper.table(SchemaEnum.EXPENSE, "claims").insert(data).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("expenses").insert(data).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase expense insert notice: {e}")

        return data

    def get_expense_by_id(self, exp_id: str) -> Optional[Dict[str, Any]]:
        expenses = self.get_all_expenses()
        for e in expenses:
            if str(e.get("expense_id")) == str(exp_id) or str(e.get("id")) == str(exp_id):
                return e
        return None
