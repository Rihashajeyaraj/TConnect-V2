from typing import List, Dict, Any
from datetime import datetime
import uuid
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_audit: List[Dict[str, Any]] = []


class AuditRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def _standardize_log(self, log: Dict[str, Any]) -> Dict[str, Any]:
        if not log:
            return {}
        row = dict(log)
        # Expose legacy field names for frontend compatibility (AuditLogs.jsx)
        row["log_id"] = row.get("id")
        row["performed_by_name"] = row.get("user_email")
        row["resource"] = row.get("entity_type")
        row["resource_id"] = row.get("entity_id")
        return row

    def get_logs(self) -> List[Dict[str, Any]]:
        logs = []
        try:
            res = self.supabase.schema("system").table("audit_logs").select("*").order("created_at", desc=True).execute()
            if res.data is not None:
                logs = [self._standardize_log(l) for l in res.data]
        except Exception:
            try:
                res = self.supabase.table("audit_logs").select("*").order("created_at", desc=True).execute()
                if res.data is not None:
                    logs = [self._standardize_log(l) for l in res.data]
            except Exception as e:
                logger.warning(f"Using memory fallback for audit logs: {e}")
        
        if not logs:
            logs = [self._standardize_log(l) for l in _in_memory_audit]
            
        return logs

    def create_log(self, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        log_id = data.get("id") or str(uuid.uuid4())
        user_id = data.get("user_id") or str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "")
        user_email = data.get("user_email") or str((user_payload or {}).get("email") or "system@tconnect.com")
        role = data.get("role") or str((user_payload or {}).get("role") or "System")
        
        payload = {
            "id": log_id,
            "user_id": user_id if user_id else None,
            "user_email": user_email,
            "role": role,
            "action": str(data.get("action") or "UNKNOWN_ACTION"),
            "entity_type": str(data.get("entity_type") or "unknown"),
            "entity_id": str(data.get("entity_id") or ""),
            "details": data.get("details") or {},
            "ip_address": str(data.get("ip_address") or "127.0.0.1"),
            "created_at": datetime.utcnow().isoformat()
        }

        # Try inserting to hrms/system schemas
        try:
            res = self.supabase.schema("system").table("audit_logs").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"Audit log created in system.audit_logs: {res.data[0]}")
                return self._standardize_log(res.data[0])
        except Exception as e:
            logger.warning(f"Failed to insert into system.audit_logs: {e}")
            try:
                res = self.supabase.table("audit_logs").insert(payload).execute()
                if res.data and len(res.data) > 0:
                    logger.info(f"Audit log created in public.audit_logs: {res.data[0]}")
                    return self._standardize_log(res.data[0])
            except Exception as e2:
                logger.warning(f"Failed to insert into public.audit_logs: {e2}")

        _in_memory_audit.insert(0, payload)
        return self._standardize_log(payload)
