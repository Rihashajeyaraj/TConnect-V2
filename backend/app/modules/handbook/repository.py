from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.core.logger import logger

class HandbookRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()

    def get_published_documents(self) -> List[Dict[str, Any]]:
        """Get published handbook documents for regular employees."""
        for schema_attempt in ["organization", "public"]:
            try:
                res = self.supabase.schema(schema_attempt).table("handbook_documents") \
                    .select("*").eq("status", "Published").order("category", desc=False).execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.debug(f"handbook lookup in {schema_attempt}: {e}")
        return []

    def get_all_documents(self) -> List[Dict[str, Any]]:
        """Get all handbook documents (Draft, Published, Archived) for Managers/Admins."""
        for schema_attempt in ["organization", "public"]:
            try:
                res = self.supabase.schema(schema_attempt).table("handbook_documents") \
                    .select("*").order("created_at", desc=True).execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.debug(f"all handbook lookup in {schema_attempt}: {e}")
        return []

    def create_document(self, data: Dict[str, Any], user_email: str = "") -> Dict[str, Any]:
        hdb_id = f"HDB-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.utcnow().isoformat()

        payload = {
            "id": hdb_id,
            "title": str(data.get("title") or "Company Policy"),
            "category": str(data.get("category") or "General Guidelines"),
            "content": str(data.get("content") or ""),
            "version": int(data.get("version") or 1),
            "status": str(data.get("status") or "Published"),
            "created_by": user_email,
            "published_at": now_iso if data.get("status") == "Published" else None,
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        for schema_attempt in ["organization", "public"]:
            try:
                res = self.supabase.schema(schema_attempt).table("handbook_documents").insert(payload).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Failed inserting handbook document into {schema_attempt}: {e}")

        return payload

    def update_document(self, doc_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        updates["updated_at"] = datetime.utcnow().isoformat()
        if updates.get("status") == "Published":
            updates["published_at"] = datetime.utcnow().isoformat()

        for schema_attempt in ["organization", "public"]:
            try:
                res = self.supabase.schema(schema_attempt).table("handbook_documents").update(updates).eq("id", doc_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Failed updating handbook document in {schema_attempt}: {e}")
        return None
