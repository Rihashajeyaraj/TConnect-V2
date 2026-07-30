from typing import List, Optional, Dict, Any
from app.database.supabase import get_supabase_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_opps: List[Dict[str, Any]] = []


class PipelineRepository:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.helper = get_schema_helper()

    def get_all_opportunities(self) -> List[Dict[str, Any]]:
        try:
            res = self.helper.table(SchemaEnum.PIPELINE, "opportunities").select("*").execute()
            if res.data is not None:
                return res.data
        except Exception:
            try:
                res = self.supabase.table("opportunities").select("*").execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.warning(f"Using memory fallback for pipeline opportunities: {e}")
        return _in_memory_opps

    def create_opportunity(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["id"] = data.get("id") or f"opp_{len(_in_memory_opps)+1:03d}"
        try:
            res = self.helper.table(SchemaEnum.PIPELINE, "opportunities").insert(data).execute()
            if res.data:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("opportunities").insert(data).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Stored opportunity in memory fallback: {e}")

        _in_memory_opps.append(data)
        return data

    def get_opportunity_by_id(self, opp_id: str) -> Optional[Dict[str, Any]]:
        opps = self.get_all_opportunities()
        for o in opps:
            if str(o.get("id")) == str(opp_id):
                return o
        return None
