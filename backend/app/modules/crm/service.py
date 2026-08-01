from typing import List, Dict, Any
from app.modules.crm.repository import CRMRepository
from app.modules.crm.schemas import LeadCreate, LeadUpdate
from app.exceptions.base import NotFoundException


class CRMService:
    def __init__(self, repo: CRMRepository = None):
        self.repo = repo or CRMRepository()

    def list_leads(self) -> List[Dict[str, Any]]:
        return self.repo.get_all_leads()

    def create_lead(self, data: LeadCreate) -> Dict[str, Any]:
        payload = data.model_dump()
        payload["status"] = "NEW"
        return self.repo.create_lead(payload)

    def get_lead(self, lead_id: str) -> Dict[str, Any]:
        lead = self.repo.get_lead_by_id(lead_id)
        if not lead:
            raise NotFoundException(resource="Lead", identifier=lead_id)
        return lead

    def update_lead(self, lead_id: str, data: LeadUpdate) -> Dict[str, Any]:
        payload = data.model_dump(exclude_unset=True)
        return self.repo.update_lead(lead_id, payload)

