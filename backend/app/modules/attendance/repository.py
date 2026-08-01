from typing import List, Optional, Dict, Any
import uuid
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger


class AttendanceRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def get_all_logs(self) -> List[Dict[str, Any]]:
        try:
            res = self.helper.table(SchemaEnum.ATTENDANCE, "logs").select("*").execute()
            if res.data is not None:
                return res.data
        except Exception:
            try:
                res = self.supabase.table("attendance_logs").select("*").execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.warning(f"Supabase attendance logs fetch error: {e}")
        return []

    def create_log(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["id"] = data.get("id") or str(uuid.uuid4())
        data["attendance_id"] = data.get("attendance_id") or data["id"]

        try:
            res = self.helper.table(SchemaEnum.ATTENDANCE, "logs").insert(data).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("attendance_logs").insert(data).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase attendance log insert notice: {e}")

        return data
