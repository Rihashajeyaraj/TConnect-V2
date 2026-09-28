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

    def update_target(self, target_id: str, updates: SalesTargetUpdate, context: Any = None) -> Dict[str, Any]:
        if context:
            self._enforce_target_scope(target_id, context)
        return self.repository.update_target(target_id, updates.dict(exclude_unset=True))

    def delete_target(self, target_id: str, context: Any = None) -> bool:
        if context:
            self._enforce_target_scope(target_id, context)
        return self.repository.delete_target(target_id)

    def _enforce_target_scope(self, target_id: str, context: Any) -> None:
        target = self.repository.get_target_by_id(target_id)
        if not target:
            scope = context.get_scope("sales.targets.manage")
            if scope != "ORG":
                from app.exceptions.base import ForbiddenException
                raise ForbiddenException("Access denied: Target not found or outside scope.")
            return

        target_owner_id = str(target.get("executive_id") or target.get("manager_id") or target.get("executive_code") or "")
        team_ids = []
        for k in ["manager_id", "executive_id", "executive_code"]:
            val = target.get(k)
            if val:
                team_ids.append(str(val))

        try:
            from app.modules.users.repository import UserRepository
            user_repo = UserRepository()
            assigned = user_repo.get_assigned_executives_for_manager(context.employee_id) or user_repo.get_assigned_executives_for_manager(context.user_id) or []
            for ex in assigned:
                for k in ["id", "user_id", "employee_id", "employee_code"]:
                    if ex.get(k):
                        team_ids.append(str(ex[k]))
        except Exception:
            pass

        context.enforce_scope("sales.targets.manage", target_owner_id, team_member_ids=team_ids)

    def get_team_revenue_breakdown(
        self,
        user_payload: Dict[str, Any],
        mode: str = "This Month",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        target_manager_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self.repository.get_team_revenue_breakdown(
            user_payload=user_payload,
            mode=mode,
            start_date=start_date,
            end_date=end_date,
            target_manager_id=target_manager_id,
        )

    def log_activity(self, data: Dict[str, Any], user_payload: Dict[str, Any]) -> Dict[str, Any]:
        return self.repository.log_activity(data, user_payload)

    def get_activities(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        return self.repository.get_activities(user_payload)
