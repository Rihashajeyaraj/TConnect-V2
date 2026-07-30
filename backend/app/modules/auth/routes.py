from fastapi import APIRouter, Depends, status
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.auth.schemas import LoginRequest, SignUpRequest, DevTokenRequest, AuthTokenResponse
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
