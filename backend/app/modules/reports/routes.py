from fastapi import APIRouter, Depends
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.reports.schemas import DashboardSummaryResponse
from app.modules.reports.service import ReportsService
from app.modules.reports.permissions import CanViewReports, CanViewSalesDashboard

router = APIRouter(prefix="/reports", tags=["Reports & Dashboards"])


def get_service() -> ReportsService:
    return ReportsService()


@router.get("/dashboard-kpis", response_model=StandardResponse)
@router.get("/summary", response_model=StandardResponse)
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


@router.get("/ceo-dashboard", response_model=StandardResponse)
async def get_ceo_dashboard(
    user_payload: dict = Depends(get_current_user_payload),
    service: ReportsService = Depends(get_service)
):
    """Retrieve full dashboard data for the CEO Portal."""
    data = service.get_ceo_dashboard_kpis()
    return StandardResponse.success_response(
        data=data,
        message="CEO Dashboard details retrieved successfully"
    )


@router.get("/sales-dashboard", response_model=StandardResponse)
async def get_sales_dashboard(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewSalesDashboard),
    service: ReportsService = Depends(get_service)
):
    """Retrieve full Sales Executive Dashboard KPIs filtered by logged-in executive."""
    data = service.get_sales_dashboard(user_payload)
    return StandardResponse.success_response(
        data=data,
        message="Sales dashboard data retrieved successfully"
    )


@router.get("/saved", response_model=StandardResponse)
async def get_saved_reports(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewReports),
    service: ReportsService = Depends(get_service)
):
    """Retrieve saved analytical reports."""
    reports = service.get_saved_reports() if hasattr(service, "get_saved_reports") else []
    return StandardResponse.success_response(
        data=reports,
        message="Saved reports retrieved successfully"
    )


@router.post("/eod", response_model=StandardResponse)
async def submit_eod_report(
    data: dict,
    user_payload: dict = Depends(get_current_user_payload),
    service: ReportsService = Depends(get_service)
):
    """Submit daily EOD work report by Sales Executive."""
    result = service.submit_eod_report(data, user_payload)
    return StandardResponse.success_response(
        data=result,
        message="Daily EOD work report submitted successfully"
    )


@router.get("/eod", response_model=StandardResponse)
@router.get("/team-eod", response_model=StandardResponse)
async def get_eod_reports(
    user_payload: dict = Depends(get_current_user_payload),
    service: ReportsService = Depends(get_service)
):
    """Get team EOD work reports scoped by logged-in manager or executive."""
    reports = service.get_eod_reports(user_payload)
    return StandardResponse.success_response(
        data=reports,
        message="EOD work reports retrieved successfully"
    )


@router.post("/eod/{report_id}/acknowledge", response_model=StandardResponse)
async def acknowledge_eod_report(
    report_id: str,
    data: dict = None,
    user_payload: dict = Depends(get_current_user_payload),
    service: ReportsService = Depends(get_service)
):
    """Acknowledge an EOD work report by Sales Manager."""
    comment = (data or {}).get("comment") or (data or {}).get("managerComment") or "Acknowledged"
    result = service.acknowledge_eod_report(report_id, comment, user_payload)
    return StandardResponse.success_response(
        data=result,
        message="EOD report acknowledged successfully"
    )
