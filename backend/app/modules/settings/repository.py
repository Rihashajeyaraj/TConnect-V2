from typing import Dict, Any
from app.database.supabase import get_supabase_client
from app.core.logger import logger

_in_memory_settings: Dict[str, Any] = {
    "company_name": "TwiteConnect Inc.",
    "currency": "INR",
    "time_zone": "Asia/Kolkata",
    "allow_self_signup": False,
    "rate_limit_per_min": 60
}


class SettingsRepository:
    def __init__(self):
        self.supabase = get_supabase_client()

    def get_settings(self) -> Dict[str, Any]:
        try:
            res = self.supabase.table("app_settings").select("*").limit(1).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"Using memory fallback for settings: {e}")
        return _in_memory_settings

    def update_settings(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        _in_memory_settings.update({k: v for k, v in updates.items() if v is not None})
        try:
            res = self.supabase.table("app_settings").upsert(_in_memory_settings).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.warning(f"Updated settings in memory fallback: {e}")
        return _in_memory_settings
