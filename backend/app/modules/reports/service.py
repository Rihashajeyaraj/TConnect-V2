from typing import Dict, Any
from app.modules.reports.repository import ReportsRepository


class ReportsService:
    def __init__(self, repo: ReportsRepository = None):
        self.repo = repo or ReportsRepository()

    def get_dashboard_summary(self) -> Dict[str, Any]:
        return self.repo.get_dashboard_counts()
