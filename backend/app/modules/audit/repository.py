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
        details = row.get("details") or {}
        row["performed_by_name"] = details.get("user_name") or row.get("user_name") or row.get("user_email")
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

    def get_logs_filtered(self, filters: Dict[str, Any], user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Filtered audit log retrieval with backend role-based scope filtering.
        Supported filters:
          user_email, role, action, entity_type, from_date, to_date,
          limit (default 200), offset (default 0)
        """
        req_limit = int(filters.get("limit") or 200)
        req_offset = int(filters.get("offset") or 0)

        # If user_payload is provided, fetch a larger batch of records to filter in Python
        db_limit = 2000 if user_payload else req_limit
        db_offset = 0 if user_payload else req_offset

        logs = []
        try:
            query = (
                self.supabase.schema("system")
                .table("audit_logs")
                .select("*")
                .order("created_at", desc=True)
                .limit(db_limit)
                .offset(db_offset)
            )
            if filters.get("action"):
                query = query.eq("action", filters["action"])
            if filters.get("entity_type"):
                query = query.eq("entity_type", filters["entity_type"])
            if filters.get("role"):
                query = query.eq("role", filters["role"])
            if filters.get("user_email"):
                query = query.eq("user_email", filters["user_email"])
            if filters.get("from_date") and len(str(filters["from_date"]).strip()) >= 10:
                query = query.gte("created_at", str(filters["from_date"]).strip())
            if filters.get("to_date") and len(str(filters["to_date"]).strip()) >= 10:
                query = query.lt("created_at", str(filters["to_date"]).strip() + "T23:59:59")

            res = query.execute()
            if res.data is not None:
                logs = [self._standardize_log(l) for l in res.data]
        except Exception as e:
            logger.debug(f"system.audit_logs filtered query notice: {e}")
            try:
                res = self.supabase.table("audit_logs").select("*").order("created_at", desc=True).limit(db_limit).execute()
                if res.data is not None:
                    logs = [self._standardize_log(l) for l in res.data]
            except Exception as e2:
                logger.warning(f"Fallback audit query failed: {e2}")

        if not logs:
            logs = [self._standardize_log(l) for l in _in_memory_audit[:db_limit]]

        # Apply Backend Role-Based Scope Filtering
        if user_payload:
            from app.core.scoping import normalize_user_role, get_allowed_user_identifiers

            user_id = str(user_payload.get("sub") or user_payload.get("user_id") or "").strip()
            user_email = str(user_payload.get("email") or "").lower().strip()
            user_role = str(user_payload.get("role") or "").strip()
            user_emp_code = str(user_payload.get("employee_code") or user_payload.get("employee_id") or "").strip()

            norm_role = normalize_user_role(user_role)

            if norm_role not in ("super_admin", "ceo", "admin"):
                allowed_logs = []
                # Fetch allowed scope mapping
                allowed = get_allowed_user_identifiers(user_payload)
                allowed_emails = allowed.get("emails", set()) if allowed else set()
                allowed_codes = allowed.get("codes", set()) if allowed else set()
                allowed_ids = allowed.get("ids", set()) if allowed else set()

                # Add self email/id/code if not present
                if user_email:
                    allowed_emails.add(user_email)
                if user_emp_code:
                    allowed_codes.add(user_emp_code)
                if user_id:
                    allowed_ids.add(user_id)

                for log in logs:
                    # Resolve actor details
                    actor_id = str(log.get("user_id") or "").strip()
                    actor_email = str(log.get("user_email") or "").lower().strip()
                    actor_role = normalize_user_role(log.get("role"))

                    # Resolve target details from details JSONB
                    details = log.get("details") or {}
                    target_id = str(details.get("target_employee") or details.get("target_employee_id") or details.get("employee_id") or "").strip()
                    target_email = str(details.get("target_employee_email") or details.get("email") or details.get("executive_email") or "").lower().strip()
                    target_code = str(details.get("employee_code") or details.get("emp_code") or "").strip()

                    is_own = actor_id == user_id or (user_email and actor_email == user_email)
                    is_target_self = target_id == user_id or (user_emp_code and target_code == user_emp_code) or (user_email and target_email == user_email)

                    if norm_role == "sales_manager":
                        # Allowed if:
                        # 1. Performed by manager themselves
                        # 2. Targets manager themselves
                        # 3. Actor is a Sales Executive in their team
                        # 4. Target is in their team
                        # Managers cannot view logs performed by other managers or admins unless targeting their team
                        is_actor_team = actor_email in allowed_emails or actor_id in allowed_ids
                        is_target_team = target_email in allowed_emails or target_id in allowed_ids or target_code in allowed_codes
                        is_actor_privileged = actor_role in ("super_admin", "ceo", "admin", "sales_manager")

                        if is_own or is_target_self:
                            allowed_logs.append(log)
                        elif is_actor_privileged and not is_target_team:
                            continue
                        elif is_actor_team or is_target_team:
                            allowed_logs.append(log)

                    elif norm_role == "sales_executive":
                        # Allowed ONLY if performed by themselves or targeting themselves
                        if is_own or is_target_self:
                            allowed_logs.append(log)

                logs = allowed_logs

            # Apply offset and limit pagination
            logs = logs[req_offset : req_offset + req_limit]

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

        # Validate user_id as a UUID
        valid_user_uuid = None
        if user_id:
            try:
                uuid.UUID(str(user_id))
                valid_user_uuid = str(user_id)
            except ValueError:
                details["actor_user_id"] = str(user_id)

        details["user_name"] = user_name

        payload = {
            "id": log_id,
            "user_id": valid_user_uuid,
            "user_email": user_email,
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

