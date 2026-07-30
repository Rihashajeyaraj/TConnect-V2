from typing import List, Dict, Any
import time
from app.modules.visit.repository import VisitRepository
from app.modules.visit.schemas import VisitCreate, VisitCheckIn, VisitCheckOut
from app.exceptions.base import NotFoundException


class VisitService:
    def __init__(self, repo: VisitRepository = None):
        self.repo = repo or VisitRepository()

    def list_visits(self) -> List[Dict[str, Any]]:
        return self.repo.get_all_visits()

    def create_visit(self, data: VisitCreate, visitor_id: str) -> Dict[str, Any]:
        payload = data.model_dump()
        payload["visitor_id"] = visitor_id
        payload["status"] = "SCHEDULED"
        return self.repo.create_visit(payload)

    def check_in(self, visit_id: str, data: VisitCheckIn) -> Dict[str, Any]:
        visit = self.repo.get_visit_by_id(visit_id)
        if not visit:
            raise NotFoundException(resource="Visit", identifier=visit_id)
        visit["status"] = "IN_PROGRESS"
        visit["check_in_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
        visit["latitude"] = data.latitude
        visit["longitude"] = data.longitude
        return visit

    def check_out(self, visit_id: str, data: VisitCheckOut) -> Dict[str, Any]:
        visit = self.repo.get_visit_by_id(visit_id)
        if not visit:
            raise NotFoundException(resource="Visit", identifier=visit_id)
        visit["status"] = "COMPLETED"
        visit["check_out_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
        return visit
