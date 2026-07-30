from typing import Dict, Any
import jose.jwt
from datetime import datetime, timedelta, timezone
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import LoginRequest, SignUpRequest, DevTokenRequest
from app.core.config import settings
from app.exceptions.base import UnauthorizedException, BadRequestException


class AuthService:
    def __init__(self, repo: AuthRepository = None):
        self.repo = repo or AuthRepository()

    def generate_dev_token(self, payload: DevTokenRequest) -> Dict[str, Any]:
        exp = datetime.now(timezone.utc) + timedelta(days=7)
        role_val = payload.role or "Super Admin"
        token_payload = {
            "sub": "00000000-0000-0000-0000-000000000001",
            "email": payload.email,
            "role": role_val,
            "aud": "authenticated",
            "exp": int(exp.timestamp()),
            "user_metadata": {"role": role_val, "full_name": "Development Test User"},
            "app_metadata": {"provider": "email", "roles": [role_val]}
        }

        secret = (
            settings.SUPABASE_JWT_SECRET
            if (settings.SUPABASE_JWT_SECRET and settings.SUPABASE_JWT_SECRET != "your-jwt-secret-from-supabase")
            else settings.SECRET_KEY
        )
        token = jose.jwt.encode(token_payload, secret, algorithm=settings.ALGORITHM)

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": token_payload
        }

    def login(self, credentials: LoginRequest) -> Dict[str, Any]:
        try:
            res = self.repo.sign_in_with_password(credentials.email, credentials.password)
            if not res.session:
                raise UnauthorizedException("Invalid email or password")
            return {
                "access_token": res.session.access_token,
                "refresh_token": res.session.refresh_token,
                "token_type": "bearer",
                "user": {
                    "id": res.user.id,
                    "email": res.user.email,
                    "role": res.user.role,
                }
            }
        except Exception as e:
            raise UnauthorizedException(f"Authentication failed: {str(e)}")

    def signup(self, credentials: SignUpRequest) -> Dict[str, Any]:
        try:
            res = self.repo.sign_up(credentials.email, credentials.password)
            user = getattr(res, "user", res)
            return {
                "user_id": getattr(user, "id", str(user)),
                "email": getattr(user, "email", credentials.email),
            }
        except Exception as e:
            err_msg = str(e)
            if "rate limit" in err_msg.lower():
                err_msg = "Email rate limit exceeded by Supabase default mailer. Use POST /api/v1/auth/dev-token for instant testing."
            raise BadRequestException(f"Sign up failed: {err_msg}")
