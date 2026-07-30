from typing import Dict, Any
from app.modules.settings.repository import SettingsRepository
from app.modules.settings.schemas import SettingsUpdate


class SettingsService:
    def __init__(self, repo: SettingsRepository = None):
        self.repo = repo or SettingsRepository()

    def get_settings(self) -> Dict[str, Any]:
        return self.repo.get_settings()

    def update_settings(self, data: SettingsUpdate) -> Dict[str, Any]:
        updates = data.model_dump(exclude_unset=True)
        return self.repo.update_settings(updates)
