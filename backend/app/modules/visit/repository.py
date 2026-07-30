from typing import List, Optional, Dict, Any
from app.database.supabase import get_supabase_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_visits: List[Dict[str, Any]] = []


class VisitRepository:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.helper = get_schema_helper()

    def get_all_visits(self) -> List[Dict[str, Any]]:
        try:
            res = self.helper.table(SchemaEnum.VISIT, "visits").select("*").execute()
            if res.data is not None:
                return res.data
        except Exception:
            try:
                res = self.supabase.table("visits").select("*").execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.warning(f"Using memory fallback for visits: {e}")
        return _in_memory_visits

    def create_visit(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["id"] = data.get("id") or f"visit_{len(_in_memory_visits)+1:03d}"
        try:
            res = self.helper.table(SchemaEnum.VISIT, "visits").insert(data).execute()
            if res.data:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("visits").insert(data).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Stored visit in memory fallback: {e}")

        _in_memory_visits.append(data)
        return data

    def get_visit_by_id(self, visit_id: str) -> Optional[Dict[str, Any]]:
        visits = self.get_all_visits()
        for v in visits:
            if str(v.get("id")) == str(visit_id):
                return v
        return None
