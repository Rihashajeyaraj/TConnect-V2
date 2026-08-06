from typing import Dict, Any
from app.modules.reports.repository import ReportsRepository


class ReportsService:
    def __init__(self, repo: ReportsRepository = None):
        self.repo = repo or ReportsRepository()

    def get_dashboard_summary(self) -> Dict[str, Any]:
        """Legacy: basic counts for generic dashboard."""
        return self.repo.get_dashboard_counts()

    def get_sales_dashboard(self, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        """Full KPI data for the Sales Executive Dashboard filtered by logged-in user."""
        return self.repo.get_sales_dashboard_kpis(user_payload)
