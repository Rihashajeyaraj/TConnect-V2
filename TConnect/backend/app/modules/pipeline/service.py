from typing import List, Dict, Any
from app.modules.pipeline.repository import PipelineRepository
from app.modules.pipeline.schemas import OpportunityCreate, OpportunityUpdateStage
from app.exceptions.base import NotFoundException


class PipelineService:
    def __init__(self, repo: PipelineRepository = None):
        self.repo = repo or PipelineRepository()

    def list_opportunities(self) -> List[Dict[str, Any]]:
        return self.repo.get_all_opportunities()

    def create_opportunity(self, data: OpportunityCreate, owner_id: str) -> Dict[str, Any]:
        payload = data.model_dump()
        payload["owner_id"] = owner_id
        return self.repo.create_opportunity(payload)

    def update_stage(self, opp_id: str, data: OpportunityUpdateStage) -> Dict[str, Any]:
        opp = self.repo.get_opportunity_by_id(opp_id)
        if not opp:
            raise NotFoundException(resource="Opportunity", identifier=opp_id)
        opp["stage"] = data.stage
        if data.probability is not None:
            opp["probability"] = data.probability
        return opp
