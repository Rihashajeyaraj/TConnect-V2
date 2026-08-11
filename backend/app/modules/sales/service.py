from typing import List, Optional, Dict, Any
from app.modules.sales.repository import SalesTargetRepository
from app.modules.sales.schemas import SalesTargetCreate, SalesTargetUpdate


class SalesTargetService:
    def __init__(self):
        self.repository = SalesTargetRepository()

    def list_targets(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        return self.repository.get_all_targets(user_payload)

    def create_target(self, target_data: SalesTargetCreate, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        data = target_data.dict()
        if user_payload:
            if not data.get("manager_id"):
                data["manager_id"] = str(user_payload.get("sub") or user_payload.get("user_id") or "")
            if not data.get("manager_name"):
                data["manager_name"] = str(user_payload.get("name") or "Sales Manager")
            if not data.get("manager_email"):
                data["manager_email"] = str(user_payload.get("email") or "")
        return self.repository.create_target(data)

    def update_target(self, target_id: str, updates: SalesTargetUpdate) -> Dict[str, Any]:
        return self.repository.update_target(target_id, updates.dict(exclude_unset=True))

    def delete_target(self, target_id: str) -> bool:
        return self.repository.delete_target(target_id)
