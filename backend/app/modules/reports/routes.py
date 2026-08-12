from fastapi import APIRouter, Depends
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.core.scoping import normalize_user_role
from app.exceptions.base import ForbiddenException
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
    """Retrieve role-scoped high-level KPI dashboard metrics."""
    kpis = service.get_dashboard_summary(user_payload)
    return StandardResponse.success_response(
        data=kpis,
        message="Dashboard KPI metrics retrieved successfully"
    )


@router.get("/ceo-dashboard", response_model=StandardResponse)
async def get_ceo_dashboard(
    user_payload: dict = Depends(get_current_user_payload),
    service: ReportsService = Depends(get_service)
):
    """Retrieve full organization dashboard data for CEO / Super Admin / Admin Portal."""
    role = normalize_user_role(user_payload.get("role") or user_payload.get("user_metadata", {}).get("role"))
    if role not in ("super_admin", "ceo", "admin"):
        raise ForbiddenException("Access to CEO Dashboard is restricted to Admin, Super Admin, and CEO roles.")

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
    user_name = str(user_payload.get("name") or user_payload.get("full_name") or "")
    user_email = str(user_payload.get("email") or "").lower().strip()
    user_code = str(user_payload.get("employee_code") or user_payload.get("employee_id") or "")

    if user_name:
        data["executive_name"] = user_name
        data["executive"] = user_name
    if user_email:
        data["executive_email"] = user_email
    if user_code:
        data["employee_code"] = user_code

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
    role = normalize_user_role(user_payload.get("role") or user_payload.get("user_metadata", {}).get("role"))
    if role == "sales_executive":
        raise ForbiddenException("Sales Executives are not authorized to acknowledge EOD reports.")

    comment = (data or {}).get("comment") or (data or {}).get("managerComment") or "Acknowledged"
    result = service.acknowledge_eod_report(report_id, comment, user_payload)
    return StandardResponse.success_response(
        data=result,
        message="EOD report acknowledged successfully"
    )


@router.get("/ceo/sales-overview", response_model=StandardResponse)
async def get_ceo_sales_overview(
    from_date: str | None = None,
    to_date: str | None = None,
    manager_id: str | None = None,
    executive_id: str | None = None,
    user_payload: dict = Depends(get_current_user_payload),
    service: ReportsService = Depends(get_service)
):
    """Retrieve full organization sales overview analytics scoped for CEO / Super Admin / Admin."""
    role = normalize_user_role(user_payload.get("role") or user_payload.get("user_metadata", {}).get("role"))
    if role not in ("super_admin", "ceo", "admin"):
        raise ForbiddenException("Access to CEO Sales Overview is restricted to Admin, Super Admin, and CEO roles.")

    params = {
        "from_date": from_date,
        "to_date": to_date,
        "manager_id": manager_id,
        "executive_id": executive_id
    }
    data = service.get_ceo_sales_overview(params)
    return StandardResponse.success_response(
        data=data,
        message="CEO Sales Overview details retrieved successfully"
    )


@router.get("/ceo/customers", response_model=StandardResponse)
async def get_ceo_customer_directory(
    user_payload: dict = Depends(get_current_user_payload),
    service: ReportsService = Depends(get_service)
):
    """Full Manager → Executive → Customer hierarchy for CEO directory."""
    role = normalize_user_role(user_payload.get("role") or user_payload.get("user_metadata", {}).get("role"))
    if role not in ("super_admin", "ceo", "admin"):
        raise ForbiddenException("Access to CEO Customer Directory is restricted to Admin, Super Admin, and CEO roles.")

    data = service.get_ceo_customer_directory()
    return StandardResponse.success_response(
        data=data,
        message="CEO Customer Directory retrieved successfully"
    )
