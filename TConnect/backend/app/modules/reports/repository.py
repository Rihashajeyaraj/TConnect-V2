from typing import Dict, Any
from app.database.supabase import get_supabase_client
from app.core.logger import logger


class ReportsRepository:
    def __init__(self):
        self.supabase = get_supabase_client()

    def get_dashboard_counts(self) -> Dict[str, Any]:
        counts = {
            "total_leads": 0,
            "total_customers": 0,
            "total_visits": 0,
            "pipeline_value": 0.0,
            "pending_expenses": 0.0
        }
        try:
            leads_res = self.supabase.table("leads").select("id", count="exact").execute()
            if hasattr(leads_res, "count") and leads_res.count is not None:
                counts["total_leads"] = leads_res.count
        except Exception:
            pass
        return counts
