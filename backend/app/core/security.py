from typing import Dict, Any
import jose.jwt
from jose import JWTError
from app.core.config import settings
from app.exceptions.base import UnauthorizedException
from app.core.logger import logger
from app.database.supabase import get_supabase_client


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Decodes and verifies JWT Bearer token issued by Supabase Auth.
    Supports HMAC verification, Supabase API verification, and dev fallback.
    """
    if not token or not isinstance(token, str):
        raise UnauthorizedException("Token is empty or invalid")

    # 1. Local HMAC-SHA256 JWT Verification
    if settings.SUPABASE_JWT_SECRET and settings.SUPABASE_JWT_SECRET != "your-jwt-secret-from-supabase":
        try:
            payload = jose.jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=[settings.ALGORITHM],
                options={"verify_aud": False}
            )
            return payload
        except JWTError as e:
            logger.warning(f"JWT verification failed with secret: {str(e)}")
            raise UnauthorizedException("Invalid or expired token")

    # 2. Online verification via Supabase Auth API
    try:
        supabase = get_supabase_client()
        user_res = supabase.auth.get_user(token)
        if user_res and user_res.user:
            u = user_res.user
            return {
                "sub": str(u.id),
                "email": u.email,
                "role": u.role,
                "user_metadata": u.user_metadata or {},
                "app_metadata": u.app_metadata or {},
            }
    except Exception as e:
        logger.warning(f"Supabase Auth API token verification failed: {str(e)}")

    # 3. Development mode unverified payload extraction fallback
    if settings.ENVIRONMENT == "development":
        try:
            payload = jose.jwt.decode(
                token,
                key="",
                options={"verify_signature": False, "verify_aud": False}
            )
            logger.info("Decoded JWT payload without signature check (Development Mode).")
            return payload
        except Exception as e:
            logger.error(f"Failed unverified JWT decode: {e}")

    raise UnauthorizedException("Invalid token or token expired")
