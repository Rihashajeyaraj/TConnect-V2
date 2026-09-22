from typing import Dict, Any, List
from app.modules.settings.repository import SettingsRepository
from app.modules.settings.schemas import SettingsUpdate


class SettingsService:
    def __init__(self, repo: SettingsRepository = None):
        self.repo = repo or SettingsRepository()

    def get_products(self) -> List[Dict[str, Any]]:
        return self.repo.get_products()

    def get_settings(self) -> Dict[str, Any]:
        return self.repo.get_settings()

    def update_settings(self, data: SettingsUpdate) -> Dict[str, Any]:
        updates = data.model_dump(exclude_unset=True)
        return self.repo.update_settings(updates)

    def create_branch(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.repo.create_branch(data)

    def update_branch(self, branch_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.repo.update_branch(branch_id, data)

    def delete_branch(self, branch_id: str) -> None:
        self.repo.delete_branch(branch_id)

    def create_product(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.repo.create_product(data)

    def update_product(self, product_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.repo.update_product(product_id, data)

    def delete_product(self, product_id: str) -> None:
        self.repo.delete_product(product_id)

    def delete_role(self, role_id: str) -> None:
        self.repo.delete_role(role_id)

    def toggle_role_status(self, role_id: str, is_active: bool) -> Dict[str, Any]:
        return self.repo.toggle_role_status(role_id, is_active)

    def get_role_users(self, role_id: str) -> List[Dict[str, Any]]:
        return self.repo.get_role_users(role_id)

    def update_role_users(self, role_id: str, user_ids: List[str]) -> Dict[str, Any]:
        return self.repo.update_role_users(role_id, user_ids)

    def duplicate_role(self, role_id: str, new_name: str, new_description: str = None) -> Dict[str, Any]:
        return self.repo.duplicate_role(role_id, new_name, new_description)

    def get_landmarks(self) -> List[Dict[str, Any]]:
        return self.repo.get_landmarks()


    def create_landmark(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.repo.create_landmark(data)

    def get_departments(self) -> List[Dict[str, Any]]:
        return self.repo.get_departments()

    def create_department(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.repo.create_department(data)

    def update_department(self, dept_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.repo.update_department(dept_id, data)

    def delete_department(self, dept_id: str) -> None:
        self.repo.delete_department(dept_id)

    def get_document_types(self) -> List[Dict[str, Any]]:
        return self.repo.get_document_types()

    def create_document_type(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.repo.create_document_type(data)


