from fastapi import APIRouter, Depends, status
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.attendance.schemas import ClockInRequest, ClockOutRequest, AttendanceResponse
from app.modules.attendance.service import AttendanceService
from app.modules.attendance.permissions import CanViewAttendance, CanRecordAttendance

router = APIRouter(prefix="/attendance", tags=["Attendance Management"])


def get_service() -> AttendanceService:
    return AttendanceService()


@router.get("", response_model=StandardResponse)
async def get_attendance_logs(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewAttendance),
    service: AttendanceService = Depends(get_service)
):
    """Retrieve attendance logs."""
    logs = service.list_logs()
    return StandardResponse.success_response(
        data=logs,
        message="Attendance logs retrieved successfully"
    )


@router.post("/clock-in", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def clock_in(
    data: ClockInRequest,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanRecordAttendance),
    service: AttendanceService = Depends(get_service)
):
    """Record clock-in for the authenticated user."""
    user_id = user_payload.get("sub", "user_001")
    log = service.clock_in(user_id, data)
    return StandardResponse.success_response(
        data=log,
        message="Clocked in successfully"
    )


@router.post("/clock-out", response_model=StandardResponse)
async def clock_out(
    data: ClockOutRequest,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanRecordAttendance),
    service: AttendanceService = Depends(get_service)
):
    """Record clock-out for the authenticated user."""
    user_id = user_payload.get("sub", "user_001")
    log = service.clock_out(user_id, data)
    return StandardResponse.success_response(
        data=log,
        message="Clocked out successfully"
    )
