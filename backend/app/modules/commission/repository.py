from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.core.logger import logger

class CommissionRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()

    def get_rules(self, active_only: bool = True) -> List[Dict[str, Any]]:
        for schema_attempt in ["finance", "public"]:
            try:
                query = self.supabase.schema(schema_attempt).table("commission_rules").select("*").order("min_value", desc=False)
                if active_only:
                    query = query.eq("is_active", True)
                res = query.execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.debug(f"commission_rules lookup in {schema_attempt}: {e}")
        return []

    def create_rule(self, data: Dict[str, Any], user_email: str = "") -> Dict[str, Any]:
        cmr_id = f"CMR-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.utcnow().isoformat()
        payload = {
            "id": cmr_id,
            "title": str(data.get("title") or "Sales Commission Rule"),
            "min_value": float(data.get("min_value") or 0.0),
            "max_value": float(data.get("max_value")) if data.get("max_value") is not None else None,
            "commission_type": str(data.get("commission_type") or "Percentage"),
            "commission_value": float(data.get("commission_value") or 5.0),
            "is_active": bool(data.get("is_active", True)),
            "effective_from": data.get("effective_from") or datetime.utcnow().strftime("%Y-%m-%d"),
            "effective_to": data.get("effective_to"),
            "created_by": user_email,
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        for schema_attempt in ["finance", "public"]:
            try:
                res = self.supabase.schema(schema_attempt).table("commission_rules").insert(payload).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Failed inserting commission rule in {schema_attempt}: {e}")
        return payload

    def update_rule(self, rule_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        updates["updated_at"] = datetime.utcnow().isoformat()
        for schema_attempt in ["finance", "public"]:
            try:
                res = self.supabase.schema(schema_attempt).table("commission_rules").update(updates).eq("id", rule_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Failed updating commission rule in {schema_attempt}: {e}")
        return None
