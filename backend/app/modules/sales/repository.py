from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.core.logger import logger

_in_memory_targets: List[Dict[str, Any]] = []


def is_valid_uuid(val: Any) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


class SalesTargetRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()

    def get_all_targets(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        user_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "")
        user_email = str((user_payload or {}).get("email") or "").lower().strip()
        user_role = str((user_payload or {}).get("role") or "").strip()

        is_manager = user_role in ("Sales Manager", "Manager")
        is_executive = user_role not in ("Admin", "Super Admin", "System Admin", "Sales Manager", "Manager", "CEO")

        fetched = []
        for schema_attempt in ["sales", "public"]:
            try:
                if schema_attempt == "sales":
                    res = self.supabase.schema("sales").table("sales_target").select("*").order("created_at", desc=True).execute()
                else:
                    res = self.supabase.table("sales_target").select("*").order("created_at", desc=True).execute()

                if res.data is not None and len(res.data) > 0:
                    fetched = [dict(r) for r in res.data]
                    break
            except Exception as e:
                logger.debug(f"sales_target fetch in {schema_attempt} notice: {e}")

        if not fetched:
            fetched = list(_in_memory_targets)

        # Apply scoping if needed
        if is_manager and user_email:
            scoped = [
                t for t in fetched
                if str(t.get("manager_email") or "").lower().strip() == user_email or
                   str(t.get("manager_id") or "").strip() == user_id
            ]
            return scoped if scoped else fetched
        elif is_executive and user_email:
            scoped = [
                t for t in fetched
                if str(t.get("executive_email") or "").lower().strip() == user_email or
                   str(t.get("executive_id") or "").strip() == user_id
            ]
            return scoped if scoped else fetched

        return fetched

    def create_target(self, data: Dict[str, Any]) -> Dict[str, Any]:
        target_uuid = str(uuid.uuid4())
        now_iso = datetime.utcnow().isoformat()

        payload = {
            "id": target_uuid,
            "manager_id": str(data.get("manager_id") or ""),
            "manager_name": str(data.get("manager_name") or "Sales Manager"),
            "manager_email": str(data.get("manager_email") or ""),
            "executive_id": str(data.get("executive_id") or ""),
            "executive_code": str(data.get("executive_code") or ""),
            "executive_name": str(data.get("executive_name") or "Sales Executive"),
            "executive_email": str(data.get("executive_email") or ""),
            "target_amount": float(data.get("target_amount") or 500000.0),
            "achieved_amount": float(data.get("achieved_amount") or 0.0),
            "period": str(data.get("period") or "Monthly"),
            "start_date": data.get("start_date"),
            "end_date": data.get("end_date"),
            "notes": str(data.get("notes") or ""),
            "status": str(data.get("status") or "Active"),
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        inserted_row = None

        # 1. Primary: sales.sales_target
        try:
            res = self.supabase.schema("sales").table("sales_target").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[SALES TARGET INSERT SUCCESS] Saved to sales.sales_target: {res.data[0]}")
                inserted_row = res.data[0]
        except Exception as e1:
            logger.warning(f"sales.sales_target insert attempt notice: {e1}")

        # 2. Fallback: public.sales_target
        if not inserted_row:
            try:
                res_pub = self.supabase.table("sales_target").insert(payload).execute()
                if res_pub.data and len(res_pub.data) > 0:
                    logger.info(f"[SALES TARGET INSERT SUCCESS] Saved to public.sales_target: {res_pub.data[0]}")
                    inserted_row = res_pub.data[0]
            except Exception as e2:
                logger.debug(f"public.sales_target insert notice: {e2}")

        if not inserted_row:
            inserted_row = payload
            _in_memory_targets.insert(0, payload)

        return dict(inserted_row)

    def update_target(self, target_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        payload = {k: v for k, v in updates.items() if v is not None}
        payload["updated_at"] = datetime.utcnow().isoformat()

        # 1. Try sales.sales_target
        try:
            res = self.supabase.schema("sales").table("sales_target").update(payload).eq("id", target_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("sales_target").update(payload).eq("id", target_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"sales_target update notice: {e}")

        for t in _in_memory_targets:
            if str(t.get("id")) == str(target_id):
                t.update(payload)
                return t

        return updates

    def delete_target(self, target_id: str) -> bool:
        try:
            self.supabase.schema("sales").table("sales_target").delete().eq("id", target_id).execute()
        except Exception:
            try:
                self.supabase.table("sales_target").delete().eq("id", target_id).execute()
            except Exception:
                pass

        global _in_memory_targets
        _in_memory_targets = [t for t in _in_memory_targets if str(t.get("id")) != str(target_id)]
        return True
