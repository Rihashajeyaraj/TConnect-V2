from typing import List, Optional, Dict, Any
import uuid
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger


class PipelineRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
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
                logger.warning(f"Supabase opportunities fetch notice: {e}")
        return []

    def create_opportunity(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["id"] = data.get("id") or str(uuid.uuid4())
        data["opportunity_id"] = data.get("opportunity_id") or data["id"]
        try:
            res = self.helper.table(SchemaEnum.PIPELINE, "opportunities").insert(data).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("opportunities").insert(data).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase opportunity insert notice: {e}")

        return data

    def get_opportunity_by_id(self, opp_id: str) -> Optional[Dict[str, Any]]:
        opps = self.get_all_opportunities()
        for o in opps:
            if str(o.get("opportunity_id")) == str(opp_id) or str(o.get("id")) == str(opp_id):
                return o
        return None
