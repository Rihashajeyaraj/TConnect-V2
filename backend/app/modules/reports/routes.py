from fastapi import APIRouter, Depends
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.reports.schemas import DashboardSummaryResponse
from app.modules.reports.service import ReportsService
from app.modules.reports.permissions import CanViewReports

router = APIRouter(prefix="/reports", tags=["Reports & Dashboards"])


def get_service() -> ReportsService:
    return ReportsService()


@router.get("/dashboard-kpis", response_model=StandardResponse)
async def get_dashboard_kpis(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewReports),
    service: ReportsService = Depends(get_service)
):
    """Retrieve high-level KPI dashboard metrics."""
    kpis = service.get_dashboard_summary()
    return StandardResponse.success_response(
        data=kpis,
        message="Dashboard KPI metrics retrieved successfully"
    )
