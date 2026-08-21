from typing import Dict, Any
import jose.jwt
from jose import JWTError
from app.core.config import settings
from app.exceptions.base import UnauthorizedException
from app.core.logger import logger
from app.database.supabase import get_supabase_client
import re


def _normalize_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    email = (payload.get("email") or payload.get("user_metadata", {}).get("email") or "").lower().strip()
    sanitized_id = re.sub(r'[^a-zA-Z0-9]', '_', email) if email else "usr_anon"
    sub = payload.get("sub") or payload.get("user_id") or payload.get("id") or f"usr_{sanitized_id}"
    user_metadata = payload.get("user_metadata") or {}
    role = user_metadata.get("role") or payload.get("role") or "Sales Executive"
    email_prefix = email.split('@')[0].upper() if email else "001"
    emp_code = user_metadata.get("employee_code") or user_metadata.get("employee_id") or payload.get("employee_id") or f"EMP-{email_prefix}"
    name = user_metadata.get("full_name") or user_metadata.get("name") or payload.get("name") or (email.split('@')[0] if email else "User")

    return {
        "sub": str(sub),
        "user_id": str(sub),
        "id": str(sub),
        "email": email,
        "role": role,
        "employee_id": emp_code,
        "employee_code": emp_code,
        "name": name,
        "user_metadata": user_metadata,
        "app_metadata": payload.get("app_metadata") or {},
    }


def create_access_token(data: Dict[str, Any]) -> str:
    """Create a signed/encoded JWT access token for testing or authorization."""
    secret = settings.SUPABASE_JWT_SECRET if (settings.SUPABASE_JWT_SECRET and settings.SUPABASE_JWT_SECRET != "your-jwt-secret-from-supabase") else "dev-secret-key-12345"
    return jose.jwt.encode(data, secret, algorithm=settings.ALGORITHM)


def create_biometric_token(employee_id: str, employee_name: str, device_user_id: str, challenge_salt: str = None) -> str:
    """Create a short-lived cryptographically signed token verifying a successful face match."""
    import time
    payload = {
        "verified_employee_id": str(employee_id),
        "verified_employee_name": str(employee_name),
        "device_user_id": str(device_user_id),
        "type": "biometric_verification",
        "exp": int(time.time()) + 300, # 5 minutes expiry
        "matched_at": int(time.time())
    }
    if challenge_salt:
        payload["challenge_salt"] = challenge_salt
    # Use settings.SECRET_KEY to sign
    return jose.jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_biometric_token(token: str) -> Dict[str, Any]:
    """Verify and decode a biometric match token. Raises ValueError if invalid/expired."""
    try:
        payload = jose.jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "biometric_verification":
            raise ValueError("Invalid token type")
        return payload
    except Exception as e:
        raise ValueError(f"Invalid or expired verification token: {str(e)}")


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Decodes and verifies JWT Bearer token issued by Supabase Auth or Dev token generator.
    Supports HMAC verification across configured secrets, Supabase API verification, and dev fallback.
    """
    if not token or not isinstance(token, str):
        raise UnauthorizedException("Token is empty or invalid")

    # 1. Local HMAC-SHA256 JWT Verification - check all possible signing secrets
    secrets_to_try = [
        settings.SECRET_KEY,
        "dev-secret-key-12345",
    ]
    if settings.SUPABASE_JWT_SECRET and settings.SUPABASE_JWT_SECRET != "your-jwt-secret-from-supabase":
        secrets_to_try.insert(0, settings.SUPABASE_JWT_SECRET)

    for secret in secrets_to_try:
        try:
            payload = jose.jwt.decode(
                token,
                secret,
                algorithms=[settings.ALGORITHM],
                options={"verify_aud": False}
            )
            return _normalize_payload(payload)
        except JWTError:
            continue

    # 2. Online verification via Supabase Auth API
    try:
        supabase = get_supabase_client()
        user_res = supabase.auth.get_user(token)
        if user_res and user_res.user:
            u = user_res.user
            return _normalize_payload({
                "sub": str(u.id),
                "email": u.email,
                "role": u.role,
                "user_metadata": u.user_metadata or {},
                "app_metadata": u.app_metadata or {},
            })
    except Exception as e:
        logger.warning(f"Supabase Auth API token verification failed: {str(e)}")

    # 3. Development mode unverified payload extraction fallback
    if settings.ENVIRONMENT == "development" or settings.DEBUG:
        try:
            payload = jose.jwt.decode(
                token,
                key="",
                options={"verify_signature": False, "verify_aud": False}
            )
            logger.info("Decoded JWT payload without signature check (Development Mode).")
            return _normalize_payload(payload)
        except Exception as e:
            logger.error(f"Failed unverified JWT decode: {e}")

    raise UnauthorizedException("Invalid token or token expired")
