from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.core.logger import logger

class HolidayRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()

    def get_holidays(self, year: Optional[int] = None, active_only: bool = True) -> List[Dict[str, Any]]:
        for schema_attempt in ["hrms", "public"]:
            try:
                query = self.supabase.schema(schema_attempt).table("holidays").select("*").order("date", desc=False)
                if active_only:
                    query = query.eq("is_active", True)
                if year:
                    query = query.eq("year", year)
                res = query.execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.debug(f"holidays table lookup in {schema_attempt}: {e}")
        return []

    def create_holiday(self, data: Dict[str, Any], user_email: str = "") -> Dict[str, Any]:
        hol_id = data.get("id") or f"HOL-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.utcnow().isoformat()
        date_str = str(data.get("date") or datetime.utcnow().strftime("%Y-%m-%d"))
        year_val = int(date_str.split("-")[0]) if "-" in date_str else datetime.utcnow().year

        payload = {
            "id": hol_id,
            "name": str(data.get("name") or data.get("title") or "Company Holiday"),
            "date": date_str,
            "year": year_val,
            "type": str(data.get("type") or "Mandatory"),
            "location": str(data.get("location") or "All"),
            "description": str(data.get("description") or ""),
            "is_emergency": bool(data.get("is_emergency", False)),
            "is_active": bool(data.get("is_active", True)),
            "created_by": user_email or str(data.get("created_by") or ""),
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        for schema_attempt in ["hrms", "public"]:
            try:
                res = self.supabase.schema(schema_attempt).table("holidays").insert(payload).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Failed inserting holiday into {schema_attempt}: {e}")

        return payload

    def bulk_create_holidays(self, holidays_list: List[Dict[str, Any]], user_email: str = "") -> List[Dict[str, Any]]:
        created_records = []
        for hol_data in holidays_list:
            if not hol_data.get("name") and not hol_data.get("title"):
                continue
            rec = self.create_holiday(hol_data, user_email=user_email)
            created_records.append(rec)

        # Trigger notification to all employees
        if created_records:
            try:
                from app.modules.notification.repository import NotificationRepository
                notif_repo = NotificationRepository()
                count = len(created_records)
                notif_repo.create_notification({
                    "title": "🎉 Holiday Calendar Updated",
                    "message": f"Admin uploaded/updated {count} company holiday(s). Check the Holiday Calendar for details!",
                    "type": "HOLIDAY",
                    "recipient_role": "all",
                })
            except Exception as e:
                logger.warning(f"Failed sending bulk holiday notification: {e}")

        return created_records

    def create_adhoc_holiday(self, data: Dict[str, Any], user_email: str = "") -> Dict[str, Any]:
        data["is_emergency"] = True
        data["type"] = data.get("type") or "Emergency"
        created = self.create_holiday(data, user_email=user_email)

        # Trigger emergency notification to all employees
        try:
            from app.modules.notification.repository import NotificationRepository
            notif_repo = NotificationRepository()
            loc_str = str(data.get("location") or "All")
            date_str = str(data.get("date") or "")
            title_str = str(data.get("name") or data.get("title") or "Ad-Hoc Leave")
            desc_str = str(data.get("description") or "")

            notif_repo.create_notification({
                "title": f"🚨 Additional Leave Declared: {title_str}",
                "message": f"Special Holiday declared on {date_str} for location: {loc_str}. {desc_str}".strip(),
                "type": "EMERGENCY_HOLIDAY",
                "recipient_role": "all",
            })
        except Exception as e:
            logger.warning(f"Failed sending ad-hoc holiday notification: {e}")

        return created

    def update_holiday(self, hol_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        updates["updated_at"] = datetime.utcnow().isoformat()
        if "date" in updates and updates["date"]:
            try:
                updates["year"] = int(str(updates["date"]).split("-")[0])
            except Exception:
                pass

        for schema_attempt in ["hrms", "public"]:
            try:
                res = self.supabase.schema(schema_attempt).table("holidays").update(updates).eq("id", hol_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Failed updating holiday in {schema_attempt}: {e}")
        return None

    def delete_holiday(self, hol_id: str) -> bool:
        for schema_attempt in ["hrms", "public"]:
            try:
                self.supabase.schema(schema_attempt).table("holidays").update({"is_active": False}).eq("id", hol_id).execute()
                return True
            except Exception as e:
                logger.warning(f"Failed deactivating holiday in {schema_attempt}: {e}")
        return False

