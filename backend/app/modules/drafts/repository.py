from typing import List, Dict, Any, Optional
from app.database.supabase import get_supabase_admin_client, get_supabase_client
import logging

logger = logging.getLogger("TwiteConnect Backend")

_in_memory_drafts = {}

class DraftsRepository:
    def __init__(self):
        self.client = get_supabase_admin_client() or get_supabase_client()

    def _clean_draft_data(self, data: Any) -> Any:
        if not data or not isinstance(data, (dict, list)):
            return data
        if isinstance(data, list):
            return [self._clean_draft_data(item) for item in data]
        cleaned = {}
        for k, v in data.items():
            if isinstance(v, str) and len(v) > 10000 and (v.startswith("data:") or v.startswith("blob:")):
                continue
            elif isinstance(v, (dict, list)):
                cleaned[k] = self._clean_draft_data(v)
            else:
                cleaned[k] = v
        return cleaned

    def save_draft(self, user_id: str, form_key: str, record_id: str, draft_data: Dict[str, Any]) -> Dict[str, Any]:
        record_id = record_id or "new"
        cleaned_data = self._clean_draft_data(draft_data or {})
        payload = {
            "user_id": user_id,
            "form_key": form_key,
            "record_id": record_id,
            "draft_data": cleaned_data
        }
        key = (user_id, form_key, record_id)
        _in_memory_drafts[key] = {
            "draft_id": f"draft_{user_id}_{form_key}_{record_id}",
            "user_id": user_id,
            "form_key": form_key,
            "record_id": record_id,
            "draft_data": cleaned_data,
            "created_at": "now",
            "updated_at": "now"
        }
        try:
            res = self.client.table("auto_save_drafts").upsert(payload).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"Supabase auto_save_drafts save notice ({e}). Saved to memory fallback.")
        return _in_memory_drafts[key]

    def get_draft(self, user_id: str, form_key: str, record_id: str) -> Optional[Dict[str, Any]]:
        record_id = record_id or "new"
        try:
            res = self.client.table("auto_save_drafts")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("form_key", form_key)\
                .eq("record_id", record_id)\
                .execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            key = (user_id, form_key, record_id)
            return _in_memory_drafts.get(key)
        key = (user_id, form_key, record_id)
        return _in_memory_drafts.get(key)

    def delete_draft(self, user_id: str, form_key: str, record_id: str) -> bool:
        record_id = record_id or "new"
        key = (user_id, form_key, record_id)
        if key in _in_memory_drafts:
            del _in_memory_drafts[key]
        try:
            res = self.client.table("auto_save_drafts")\
                .delete()\
                .eq("user_id", user_id)\
                .eq("form_key", form_key)\
                .eq("record_id", record_id)\
                .execute()
            return True
        except Exception as e:
            logger.warning(f"Failed to delete draft from DB ({e}), cleared memory store.")
        return True
