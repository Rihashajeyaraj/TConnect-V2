from typing import List, Dict, Any
from app.modules.pipeline.repository import PipelineRepository
from app.modules.pipeline.schemas import OpportunityCreate, OpportunityUpdateStage
from app.exceptions.base import NotFoundException
from app.core.scoping import enforce_record_access


class PipelineService:
    def __init__(self, repo: PipelineRepository = None):
        self.repo = repo or PipelineRepository()

    def list_opportunities(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        return self.repo.get_all_opportunities(user_payload)

    def create_opportunity(self, data: OpportunityCreate, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        payload = data.model_dump()
        user_name = str((user_payload or {}).get("name") or (user_payload or {}).get("full_name") or "")
        user_email = str((user_payload or {}).get("email") or "").lower().strip()
        user_emp_code = str((user_payload or {}).get("employee_code") or (user_payload or {}).get("employee_id") or "")

        payload["owner_id"] = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "")
        if user_name and not payload.get("rep"):
            payload["rep"] = user_name
        if user_email and not payload.get("assigned_to_email"):
            payload["assigned_to_email"] = user_email
        if user_emp_code and not payload.get("employee_code"):
            payload["employee_code"] = user_emp_code

        return self.repo.create_opportunity(payload)

    def update_stage(self, opp_id: str, data: OpportunityUpdateStage, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        existing = self.repo.get_opportunity_by_id(opp_id)
        if not existing:
            raise NotFoundException(resource="Opportunity", identifier=opp_id)
        if user_payload:
            enforce_record_access(existing, user_payload, "opportunity")

        return self.repo.update_opportunity_stage(
            opp_id=opp_id,
            stage=data.stage,
            probability=data.probability,
            notes=data.notes,
        )
