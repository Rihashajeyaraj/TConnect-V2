from typing import Dict, Any
from app.modules.reports.repository import ReportsRepository


class ReportsService:
    def __init__(self, repo: ReportsRepository = None):
        self.repo = repo or ReportsRepository()

    def get_dashboard_summary(self, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        """Role-scoped basic counts for dashboard summary."""
        return self.repo.get_dashboard_counts(user_payload)

    def get_ceo_dashboard_kpis(self) -> Dict[str, Any]:
        """Retrieve full dashboard metrics and details for the CEO Portal."""
        return self.repo.get_ceo_dashboard_counts()

    def get_sales_dashboard(self, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        """Full KPI data for the Sales Executive Dashboard filtered by logged-in user."""
        return self.repo.get_sales_dashboard_kpis(user_payload)

    def submit_eod_report(self, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        return self.repo.create_eod_report(data, user_payload)

    def get_eod_reports(self, user_payload: Dict[str, Any] = None, params: Dict[str, Any] = None):
        return self.repo.get_eod_reports(user_payload, params)

    def acknowledge_eod_report(self, report_id: str, comment: str = "", user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        return self.repo.acknowledge_eod_report(report_id, comment, user_payload)

    def get_ceo_sales_overview(self, params: Dict[str, Any]) -> Dict[str, Any]:
        return self.repo.get_ceo_sales_overview(
            from_date=params.get("from_date"),
            to_date=params.get("to_date"),
            manager_id=params.get("manager_id"),
            executive_id=params.get("executive_id")
        )

    def get_ceo_customer_directory(self) -> Dict[str, Any]:
        return self.repo.get_ceo_customer_directory()
