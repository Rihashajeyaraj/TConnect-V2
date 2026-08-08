from typing import List, Dict, Any
from app.database.supabase import get_supabase_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_audit: List[Dict[str, Any]] = []


class AuditRepository:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.helper = get_schema_helper()

    def get_logs(self) -> List[Dict[str, Any]]:
        try:
            res = self.supabase.schema("system").table("audit_logs").select("*").execute()
            if res.data is not None:
                return res.data
        except Exception:
            try:
                res = self.supabase.table("audit_logs").select("*").execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.warning(f"Using memory fallback for audit logs: {e}")
        return _in_memory_audit
