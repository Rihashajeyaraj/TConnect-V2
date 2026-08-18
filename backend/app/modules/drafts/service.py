from typing import Dict, Any, Optional
from app.modules.drafts.repository import DraftsRepository

class DraftsService:
    def __init__(self, repository: DraftsRepository):
        self.repository = repository

    def save_draft(self, user_id: str, form_key: str, record_id: str, draft_data: Dict[str, Any]) -> Dict[str, Any]:
        return self.repository.save_draft(user_id, form_key, record_id, draft_data)

    def get_draft(self, user_id: str, form_key: str, record_id: str) -> Optional[Dict[str, Any]]:
        return self.repository.get_draft(user_id, form_key, record_id)

    def delete_draft(self, user_id: str, form_key: str, record_id: str) -> bool:
        return self.repository.delete_draft(user_id, form_key, record_id)
