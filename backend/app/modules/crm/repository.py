from typing import List, Optional, Dict, Any
from app.database.supabase import get_supabase_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_leads: List[Dict[str, Any]] = []


class CRMRepository:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.helper = get_schema_helper()

    def get_all_leads(self) -> List[Dict[str, Any]]:
        try:
            res = self.helper.table(SchemaEnum.CRM, "leads").select("*").execute()
            if res.data is not None:
                return res.data
        except Exception:
            try:
                res = self.supabase.table("leads").select("*").execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.warning(f"Using memory fallback for CRM leads: {e}")
        return _in_memory_leads

    def create_lead(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["id"] = data.get("id") or f"lead_{len(_in_memory_leads)+1:03d}"
        try:
            res = self.helper.table(SchemaEnum.CRM, "leads").insert(data).execute()
            if res.data:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("leads").insert(data).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Stored lead in memory fallback: {e}")

        _in_memory_leads.append(data)
        return data

    def get_lead_by_id(self, lead_id: str) -> Optional[Dict[str, Any]]:
        leads = self.get_all_leads()
        for lead in leads:
            if str(lead.get("id")) == str(lead_id):
                return lead
        return None
