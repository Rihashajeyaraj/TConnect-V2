from typing import List, Dict, Any, Optional
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import UserCreate, UserUpdate
from app.exceptions.base import NotFoundException, BadRequestException


class UserService:
    def __init__(self, repo: UserRepository = None):
        self.repo = repo or UserRepository()

    def get_users(self) -> List[Dict[str, Any]]:
        return self.repo.get_all_users()

    def create_user(self, data: UserCreate) -> Dict[str, Any]:
        payload = data.dict(exclude_none=True)
        return self.repo.create_user(payload)

    def update_user(self, user_id: str, data: UserUpdate) -> Dict[str, Any]:
        payload = data.dict(exclude_none=True)
        updated = self.repo.update_user(user_id, payload)
        if not updated:
            raise NotFoundException(f"User account '{user_id}' not found")
        return updated

    def delete_user(self, user_id: str) -> bool:
        return self.repo.delete_user(user_id)
