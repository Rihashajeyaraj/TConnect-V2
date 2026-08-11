from typing import List, Dict, Any
import time
from datetime import datetime
from app.modules.visit.repository import VisitRepository
from app.modules.visit.schemas import VisitCreate, VisitCheckIn, VisitCheckOut
from app.exceptions.base import NotFoundException
from app.core.scoping import enforce_record_access


class VisitService:
    def __init__(self, repo: VisitRepository = None):
        self.repo = repo or VisitRepository()

    def list_visits(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        return self.repo.get_all_visits(user_payload)

    def create_visit(self, data: Any, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        payload = data.model_dump() if hasattr(data, "model_dump") else (data if isinstance(data, dict) else {})

        # Stamp employee identity from JWT
        user_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "")
        user_email = str((user_payload or {}).get("email") or "").lower().strip()
        user_name = str((user_payload or {}).get("name") or (user_payload or {}).get("full_name") or "")
        user_emp_code = str((user_payload or {}).get("employee_code") or (user_payload or {}).get("employee_id") or "")
        user_phone = str((user_payload or {}).get("phone") or (user_payload or {}).get("mobile") or "")

        payload["visitor_id"] = user_id
        payload["employee_id"] = user_emp_code or user_id
        payload["employee_code"] = user_emp_code
        payload["employee_name"] = user_name
        payload["employee_phone"] = user_phone
        payload["employee_email"] = user_email
        payload["assigned_to"] = user_name
        payload["assigned_to_email"] = user_email
        payload["status"] = "SCHEDULED"

        return self.repo.create_visit(payload)

    def check_in(self, visit_id: str, data: VisitCheckIn, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        visit = self.repo.get_visit_by_id(visit_id)
        if not visit:
            raise NotFoundException(resource="Visit", identifier=visit_id)
        if user_payload:
            enforce_record_access(visit, user_payload, "visit")

        updates = {
            "status": "IN_PROGRESS",
            "visit_status": "IN_PROGRESS",
            "check_in_time": datetime.utcnow().isoformat(),
            "latitude": data.latitude,
            "longitude": data.longitude,
        }
        try:
            from app.database.supabase import get_supabase_admin_client
            sb = get_supabase_admin_client()
            sb.table("visits").update(updates).eq("id", visit_id).execute()
        except Exception:
            pass
        visit.update(updates)
        return visit

    def check_out(self, visit_id: str, data: VisitCheckOut, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        visit = self.repo.get_visit_by_id(visit_id)
        if not visit:
            raise NotFoundException(resource="Visit", identifier=visit_id)
        if user_payload:
            enforce_record_access(visit, user_payload, "visit")

        updates = {
            "status": "COMPLETED",
            "visit_status": "COMPLETED",
            "check_out_time": datetime.utcnow().isoformat(),
        }
        try:
            from app.database.supabase import get_supabase_admin_client
            sb = get_supabase_admin_client()
            sb.table("visits").update(updates).eq("id", visit_id).execute()
        except Exception:
            pass
        visit.update(updates)
        return visit

    def complete_visit(self, visit_id: str, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        visit = self.repo.get_visit_by_id(visit_id)
        if not visit:
            raise NotFoundException(resource="Visit", identifier=visit_id)
        if user_payload:
            enforce_record_access(visit, user_payload, "visit")

        return self.repo.complete_visit(visit_id, data)

    def get_team_audit_visits(self, user_payload: Dict[str, Any] = None, params: Dict[str, Any] = None) -> Dict[str, Any]:
        return self.repo.get_team_audit_visits(user_payload, params)
