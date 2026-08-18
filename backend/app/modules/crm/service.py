from typing import List, Dict, Any
from app.modules.crm.repository import CRMRepository
from app.modules.crm.schemas import LeadCreate, LeadUpdate
from app.exceptions.base import NotFoundException
from app.core.scoping import enforce_record_access, normalize_user_role


class CRMService:
    def __init__(self, repo: CRMRepository = None):
        self.repo = repo or CRMRepository()

    def list_leads(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        return self.repo.get_all_leads(user_payload)

    def create_lead(self, data: LeadCreate, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        payload = data.model_dump(exclude_unset=False)
        if not payload.get("status"):
            payload["status"] = "New"

        user_email = str((user_payload or {}).get("email") or "").lower().strip()
        user_name = str((user_payload or {}).get("name") or (user_payload or {}).get("full_name") or "")
        user_emp_code = str((user_payload or {}).get("employee_code") or (user_payload or {}).get("employee_id") or "")
        user_role = normalize_user_role((user_payload or {}).get("role"))

        # Sales Executives can ONLY create leads assigned to themselves
        if user_role == "sales_executive" or not payload.get("assigned_to"):
            if user_name:
                payload["assigned_to"] = user_name
            if user_email:
                payload["assigned_to_email"] = user_email
            if user_emp_code:
                payload["employee_code"] = user_emp_code

        if user_email and not payload.get("assigned_to_email"):
            payload["assigned_to_email"] = user_email
        if user_name and not payload.get("assigned_to"):
            payload["assigned_to"] = user_name
        if user_emp_code and not payload.get("employee_code"):
            payload["employee_code"] = user_emp_code

        payload["created_by_email"] = user_email
        return self.repo.create_lead(payload, user_payload)

    def get_lead(self, lead_id: str, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        lead = self.repo.get_lead_by_id(lead_id)
        if not lead:
            raise NotFoundException(resource="Lead", identifier=lead_id)
        if user_payload:
            enforce_record_access(lead, user_payload, "lead")
        return lead

    def update_lead(self, lead_id: str, data: LeadUpdate, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        existing = self.repo.get_lead_by_id(lead_id)
        if not existing:
            raise NotFoundException(resource="Lead", identifier=lead_id)
        if user_payload:
            enforce_record_access(existing, user_payload, "lead")

        payload = data.model_dump(exclude_unset=True)
        return self.repo.update_lead(lead_id, payload)

    def get_team_leads(self, user_payload: Dict[str, Any] = None, params: Dict[str, Any] = None) -> Dict[str, Any]:
        return self.repo.get_team_leads(user_payload, params)

    def list_followups(self, user_payload: Dict[str, Any] = None, active_only: bool = True) -> List[Dict[str, Any]]:
        return self.repo.get_all_followups(user_payload, active_only=active_only)

    def create_followup(self, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        return self.repo.create_followup(data, user_payload)

    def update_followup(self, followup_id: str, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        existing = self.repo.get_followup_by_id(followup_id)
        if not existing:
            raise NotFoundException(resource="Follow-up", identifier=followup_id)
        if user_payload:
            enforce_record_access(existing, user_payload, "follow-up")

        return self.repo.update_followup(followup_id, data)

    def delete_followup(self, followup_id: str, user_payload: Dict[str, Any] = None) -> bool:
        existing = self.repo.get_followup_by_id(followup_id)
        if not existing:
            raise NotFoundException(resource="Follow-up", identifier=followup_id)
        if user_payload:
            enforce_record_access(existing, user_payload, "follow-up")

        return self.repo.delete_followup(followup_id)

    def delete_lead(self, lead_id: str, user_payload: Dict[str, Any] = None) -> bool:
        existing = self.repo.get_lead_by_id(lead_id)
        if not existing:
            raise NotFoundException(resource="Lead", identifier=lead_id)
        if user_payload:
            enforce_record_access(existing, user_payload, "lead")

        return self.repo.delete_lead(lead_id)

    def search_contacts(self, query: str, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        return self.repo.search_contacts(query, user_payload)
