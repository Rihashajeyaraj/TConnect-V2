from typing import List, Dict, Any, Optional
from app.database.supabase import get_supabase_admin_client, get_supabase_client
import logging

logger = logging.getLogger("TwiteConnect Backend")

_in_memory_drafts = {}

class DraftsRepository:
    def __init__(self):
        self.client = get_supabase_admin_client() or get_supabase_client()

    def save_draft(self, user_id: str, form_key: str, record_id: str, draft_data: Dict[str, Any]) -> Dict[str, Any]:
        record_id = record_id or "new"
        payload = {
            "user_id": user_id,
            "form_key": form_key,
            "record_id": record_id,
            "draft_data": draft_data
        }
        try:
            res = self.client.schema("system").table("auto_save_drafts").upsert(payload).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            err_str = str(e)
            if "relation" in err_str.lower() or "does not exist" in err_str.lower() or "PGRST205" in err_str:
                logger.warning("Supabase table 'system.auto_save_drafts' not found. Storing in memory fallback.")
                key = (user_id, form_key, record_id)
                _in_memory_drafts[key] = {
                    "draft_id": f"draft_{user_id}_{form_key}_{record_id}",
                    "user_id": user_id,
                    "form_key": form_key,
                    "record_id": record_id,
                    "draft_data": draft_data,
                    "created_at": "now",
                    "updated_at": "now"
                }
                return _in_memory_drafts[key]
            raise e
        return payload

    def get_draft(self, user_id: str, form_key: str, record_id: str) -> Optional[Dict[str, Any]]:
        record_id = record_id or "new"
        try:
            res = self.client.schema("system").table("auto_save_drafts")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("form_key", form_key)\
                .eq("record_id", record_id)\
                .execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            err_str = str(e)
            if "relation" in err_str.lower() or "does not exist" in err_str.lower() or "PGRST205" in err_str:
                key = (user_id, form_key, record_id)
                return _in_memory_drafts.get(key)
            logger.error(f"Failed to fetch draft: {e}")
        return None

    def delete_draft(self, user_id: str, form_key: str, record_id: str) -> bool:
        record_id = record_id or "new"
        try:
            res = self.client.schema("system").table("auto_save_drafts")\
                .delete()\
                .eq("user_id", user_id)\
                .eq("form_key", form_key)\
                .eq("record_id", record_id)\
                .execute()
            return True
        except Exception as e:
            err_str = str(e)
            if "relation" in err_str.lower() or "does not exist" in err_str.lower() or "PGRST205" in err_str:
                key = (user_id, form_key, record_id)
                if key in _in_memory_drafts:
                    del _in_memory_drafts[key]
                return True
            logger.error(f"Failed to delete draft: {e}")
        return False
