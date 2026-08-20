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
