from fastapi import APIRouter, Depends, status
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.auth.schemas import LoginRequest, SignUpRequest, DevTokenRequest, AuthTokenResponse, ForgotPasswordRequest, ChangePasswordRequest
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_service() -> AuthService:
    return AuthService()


@router.post("/dev-token", response_model=StandardResponse)
async def generate_dev_token(
    payload: DevTokenRequest,
    service: AuthService = Depends(get_service)
):
    """Generate instant development JWT access token."""
    token_data = service.generate_dev_token(payload)
    return StandardResponse.success_response(
        data=token_data,
        message="Development JWT access_token generated successfully"
    )


@router.post("/login", response_model=StandardResponse)
async def login(
    credentials: LoginRequest,
    service: AuthService = Depends(get_service)
):
    """Authenticate user with email and password."""
    token_data = service.login(credentials)
    return StandardResponse.success_response(
        data=token_data,
        message="Login successful"
    )


@router.post("/signup", response_model=StandardResponse)
async def signup(
    credentials: SignUpRequest,
    service: AuthService = Depends(get_service)
):
    """Register a new user."""
    user_data = service.signup(credentials)
    return StandardResponse.success_response(
        data=user_data,
        message="User registration successful"
    )


@router.get("/me", response_model=StandardResponse)
async def get_current_user_profile(user_payload: dict = Depends(get_current_user_payload)):
    """Retrieve current authenticated user payload."""
    return StandardResponse.success_response(
        data=user_payload,
        message="Authenticated employee profile retrieved successfully"
    )


@router.post("/forgot-password", response_model=StandardResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    service: AuthService = Depends(get_service)
):
    """
    Employee submits a forgot-password request.
    - Deactivated employees are blocked immediately.
    - Active employees: creates a pending request visible to Admin.
    - Always returns a generic message (security: don't leak user existence).
    """
    result = service.request_password_reset(payload.email)
    return StandardResponse.success_response(
        data=result,
        message=result.get("message", "Request received.")
    )


@router.post("/change-password", response_model=StandardResponse)
async def change_password(
    payload: ChangePasswordRequest,
    user_payload: dict = Depends(get_current_user_payload),
    service: AuthService = Depends(get_service)
):
    """
    Authenticated employee changes their own password after Admin reset.
    Requires current (temp) password verification, then updates in Supabase.
    """
    email = str(user_payload.get("email") or "").strip().lower()
    if not email:
        from app.exceptions.base import UnauthorizedException
        raise UnauthorizedException("Could not identify user from token.")

    # Verify current password by attempting login
    from app.modules.auth.schemas import LoginRequest as LR
    try:
        service.login(LR(email=email, password=payload.current_password))
    except Exception:
        from app.exceptions.base import UnauthorizedException
        raise UnauthorizedException("Current password is incorrect.")

    if len(payload.new_password) < 8:
        from app.exceptions.base import BadRequestException
        raise BadRequestException("New password must be at least 8 characters.")

    # Update password in Supabase via admin
    supabase_user = service.repo.get_supabase_user_by_email(email)
    supabase_updated = False
    if supabase_user:
        supabase_updated = service.repo.update_user_password(supabase_user["id"], payload.new_password)

    # Also update in-memory record
    try:
        from app.modules.users.repository import UserRepository
        user_repo = UserRepository()
        all_users = user_repo.get_all_users()
        for u in all_users:
            if str(u.get("email", "")).strip().lower() == email:
                user_repo.update_user(
                    str(u.get("id") or u.get("employee_id") or ""),
                    {"accessPassword": payload.new_password, "password": payload.new_password, "first_login": False}
                )
                break
    except Exception:
        pass

    # Notify admin that employee changed their password
    try:
        from app.modules.notification.repository import NotificationRepository
        emp_name = str(user_payload.get("user_metadata", {}).get("full_name") or email.split("@")[0].title())
        NotificationRepository().create_notification({
            "recipient_role": "super admin",
            "title": "✅ Password Changed",
            "message": f"{emp_name} ({email}) has successfully changed their password.",
            "type": "INFO",
        })
    except Exception:
        pass

    # Audit log
    try:
        from app.modules.audit.service import create_audit_log
        create_audit_log(
            "PASSWORD_CHANGED", "auth.users", user_payload,
            entity_id=email, module="Authentication",
            description=f"Employee {email} changed their password. Supabase updated: {supabase_updated}",
        )
    except Exception:
        pass

    return StandardResponse.success_response(
        data={"supabase_updated": supabase_updated},
        message="Password changed successfully. Please log in with your new password."
    )

