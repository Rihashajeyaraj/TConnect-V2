from typing import List, Dict, Any, Optional
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
        # Legacy field names for frontend compatibility (AuditLogs.jsx)
        row["log_id"] = row.get("id")
        row["performed_by_name"] = row.get("user_name") or row.get("user_email")
        row["resource"] = row.get("entity_type")
        row["resource_id"] = row.get("entity_id")
        # Surface nested detail fields for easy display
        details = row.get("details") or {}
        entity_type = row.get("entity_type") or ""
        row["module"] = details.get("module") or (entity_type.split(".")[0] if "." in entity_type else entity_type)
        row["description"] = details.get("description") or ""
        return row

    def get_logs(self) -> List[Dict[str, Any]]:
        """Return all audit logs, most recent first."""
        return self.get_logs_filtered({})

    def get_logs_filtered(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Filtered audit log retrieval. Supported filters:
          user_email, role, action, entity_type, from_date, to_date,
          limit (default 200), offset (default 0)
        """
        limit = int(filters.get("limit") or 200)
        offset = int(filters.get("offset") or 0)

        logs = []
        try:
            query = (
                self.supabase.schema("system")
                .table("audit_logs")
                .select("*")
                .order("created_at", desc=True)
                .limit(limit)
                .offset(offset)
            )
            if filters.get("action"):
                query = query.eq("action", filters["action"])
            if filters.get("entity_type"):
                query = query.eq("entity_type", filters["entity_type"])
            if filters.get("role"):
                query = query.eq("role", filters["role"])
            if filters.get("user_email"):
                query = query.eq("user_email", filters["user_email"])
            if filters.get("from_date"):
                query = query.gte("created_at", filters["from_date"])
            if filters.get("to_date"):
                query = query.lt("created_at", filters["to_date"] + "T23:59:59")

            res = query.execute()
            if res.data is not None:
                logs = [self._standardize_log(l) for l in res.data]
        except Exception as e:
            logger.debug(f"system.audit_logs filtered query notice: {e}")
            try:
                res = self.supabase.table("audit_logs").select("*").order("created_at", desc=True).limit(limit).execute()
                if res.data is not None:
                    logs = [self._standardize_log(l) for l in res.data]
            except Exception as e2:
                logger.warning(f"Fallback audit query failed: {e2}")

        if not logs:
            logs = [self._standardize_log(l) for l in _in_memory_audit[:limit]]

        return logs

    def create_log(self, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Create a single immutable audit log entry.

        data keys:
          action, entity_type, entity_id, module, description,
          previous_value, new_value, details (dict), ip_address

        user_payload keys: sub/user_id, email, role, user_metadata.{full_name,role}
        """
        up = user_payload or {}
        meta = up.get("user_metadata") or {}

        log_id = data.get("id") or str(uuid.uuid4())
        user_id = data.get("user_id") or str(up.get("sub") or up.get("user_id") or "")
        user_email = data.get("user_email") or str(up.get("email") or "system@tconnect.com")
        user_name = (
            data.get("user_name")
            or meta.get("full_name")
            or meta.get("name")
            or up.get("name")
            or ""
        )
        role = data.get("role") or meta.get("role") or up.get("role") or "System"

        # Merge structured fields into details JSONB (no schema changes needed)
        details = dict(data.get("details") or {})
        if data.get("module"):
            details["module"] = data["module"]
        if data.get("description"):
            details["description"] = data["description"]
        if data.get("previous_value") is not None:
            details["previous_value"] = data["previous_value"]
        if data.get("new_value") is not None:
            details["new_value"] = data["new_value"]

        payload = {
            "id": log_id,
            "user_id": user_id if user_id else None,
            "user_email": user_email,
            "user_name": user_name,
            "role": role,
            "action": str(data.get("action") or "UNKNOWN_ACTION"),
            "entity_type": str(data.get("entity_type") or "unknown"),
            "entity_id": str(data.get("entity_id") or ""),
            "details": details,
            "ip_address": str(data.get("ip_address") or ""),
            "created_at": datetime.utcnow().isoformat(),
        }

        try:
            res = self.supabase.schema("system").table("audit_logs").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"Audit [{payload['action']}] id={res.data[0].get('id')}")
                return self._standardize_log(res.data[0])
        except Exception as e:
            logger.debug(f"system.audit_logs insert notice: {e}")
            try:
                res = self.supabase.table("audit_logs").insert(payload).execute()
                if res.data and len(res.data) > 0:
                    return self._standardize_log(res.data[0])
            except Exception as e2:
                logger.warning(f"Audit log fallback insert failed: {e2}")

        _in_memory_audit.insert(0, payload)
        return self._standardize_log(payload)

