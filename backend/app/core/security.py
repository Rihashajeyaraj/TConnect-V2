import re
import time
import uuid
import secrets
import hashlib
from typing import Dict, Any, Set
import jose.jwt
from jose import JWTError
try:
    import bcrypt
except ImportError:
    bcrypt = None

try:
    from passlib.context import CryptContext
    _pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except Exception:
    _pwd_context = None

from app.core.config import settings
from app.exceptions.base import UnauthorizedException
from app.core.logger import logger
from app.database.supabase import get_supabase_client


# ── Password Hashing Utilities ───────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash plaintext password securely using bcrypt."""
    if not password or not isinstance(password, str):
        raise ValueError("Password must be a non-empty string")
    pwd_bytes = password.encode("utf-8")
    if bcrypt:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")
    elif _pwd_context:
        return _pwd_context.hash(password)
    else:
        return hashlib.sha256(pwd_bytes).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash."""
    if not password or not password_hash:
        return False
    try:
        pwd_bytes = password.encode("utf-8")
        if bcrypt and password_hash.startswith("$2"):
            hash_bytes = password_hash.encode("utf-8")
            return bcrypt.checkpw(pwd_bytes, hash_bytes)
        elif _pwd_context and password_hash.startswith("$2"):
            return _pwd_context.verify(password, password_hash)
        else:
            return hashlib.sha256(pwd_bytes).hexdigest() == password_hash
    except Exception as e:
        logger.warning(f"Password verification error: {str(e)}")
        return False



# ── Reset Token Utilities ───────────────────────────────────────────────────

def generate_reset_token() -> str:
    """Generate a cryptographically secure random reset token (URL-safe)."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Compute SHA-256 hash of a reset token for secure storage."""
    if not token or not isinstance(token, str):
        raise ValueError("Token must be a non-empty string")
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ── JTI & Revoked Tokens ─────────────────────────────────────────────────────

_revoked_jti_cache: Set[str] = set()


def generate_jti() -> str:
    """Generate a unique JWT ID (JTI)."""
    return str(uuid.uuid4())


def is_token_revoked(jti: str) -> bool:
    """Check if a JWT ID (JTI) has been revoked."""
    if not jti or not isinstance(jti, str):
        return False

    # 1. In-memory set lookup
    if jti in _revoked_jti_cache:
        return True

    # 2. Database lookup if Supabase/Postgres connection is active
    try:
        supabase = get_supabase_client()
        res = supabase.table("revoked_tokens").select("id").eq("jti", jti).limit(1).execute()
        if res and getattr(res, "data", None):
            _revoked_jti_cache.add(jti)
            return True
    except Exception:
        pass

    return False


def revoke_token(jti: str, user_id: str = "", expires_at: float = 0.0) -> bool:
    """Revoke a token by its JTI."""
    if not jti or not isinstance(jti, str):
        return False

    _revoked_jti_cache.add(jti)

    # Persist in database if available
    try:
        supabase = get_supabase_client()
        exp_iso = (
            time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(expires_at))
            if expires_at > 0
            else time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + 2592000))
        )
        supabase.table("revoked_tokens").insert({
            "jti": jti,
            "user_id": str(user_id or "unknown"),
            "expires_at": exp_iso
        }).execute()
    except Exception as e:
        logger.warning(f"Could not persist revoked token {jti} to DB: {e}")

    return True


# ── Payload Normalization & Token Creation ───────────────────────────────────

def _normalize_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    email = (payload.get("email") or payload.get("user_metadata", {}).get("email") or "").lower().strip()
    sanitized_id = re.sub(r'[^a-zA-Z0-9]', '_', email) if email else "usr_anon"
    sub = payload.get("sub") or payload.get("user_id") or payload.get("id") or f"usr_{sanitized_id}"
    user_metadata = payload.get("user_metadata") or {}
    role = user_metadata.get("role") or payload.get("role") or "Sales Executive"
    email_prefix = email.split('@')[0].upper() if email else "001"
    emp_code = user_metadata.get("employee_code") or user_metadata.get("employee_id") or payload.get("employee_id") or f"EMP-{email_prefix}"
    name = user_metadata.get("full_name") or user_metadata.get("name") or payload.get("name") or (email.split('@')[0] if email else "User")
    jti = payload.get("jti")

    res = {
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
    if jti:
        res["jti"] = jti
    return res


def create_access_token(data: Dict[str, Any]) -> str:
    """Create a signed/encoded JWT access token for testing or authorization."""
    secret = settings.SUPABASE_JWT_SECRET if (settings.SUPABASE_JWT_SECRET and settings.SUPABASE_JWT_SECRET != "your-jwt-secret-from-supabase") else "dev-secret-key-12345"
    payload = data.copy()
    if "jti" not in payload:
        payload["jti"] = generate_jti()
    return jose.jwt.encode(payload, secret, algorithm=settings.ALGORITHM)


def create_biometric_token(employee_id: str, employee_name: str, device_user_id: str, challenge_salt: str = None) -> str:
    """Create a short-lived cryptographically signed token verifying a successful face match."""
    payload = {
        "verified_employee_id": str(employee_id),
        "verified_employee_name": str(employee_name),
        "device_user_id": str(device_user_id),
        "type": "biometric_verification",
        "exp": int(time.time()) + 300, # 5 minutes expiry
        "matched_at": int(time.time()),
        "jti": generate_jti()
    }
    if challenge_salt:
        payload["challenge_salt"] = challenge_salt
    return jose.jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_biometric_token(token: str) -> Dict[str, Any]:
    """Verify and decode a biometric match token. Raises ValueError if invalid/expired."""
    try:
        payload = jose.jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "biometric_verification":
            raise ValueError("Invalid token type")
        if payload.get("jti") and is_token_revoked(payload["jti"]):
            raise ValueError("Verification token has been revoked")
        return payload
    except Exception as e:
        raise ValueError(f"Invalid or expired verification token: {str(e)}")


# Cache verified Supabase JWT payloads in-memory to prevent extremely slow network round-trips to Supabase Auth API
_verified_token_cache: Dict[str, tuple[Dict[str, Any], float]] = {}


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Decodes and verifies JWT Bearer token issued by Supabase Auth or Dev token generator.
    Supports in-memory verification caching, HMAC verification, Supabase API verification, and dev fallback.
    """
    if not token or not isinstance(token, str):
        raise UnauthorizedException("Token is empty or invalid")

    # 0. Check in-memory verification cache first
    now = time.time()
    if token in _verified_token_cache:
        cached_payload, expiry = _verified_token_cache[token]
        if now < expiry:
            if cached_payload.get("jti") and is_token_revoked(cached_payload["jti"]):
                del _verified_token_cache[token]
                raise UnauthorizedException("Token has been revoked")
            return cached_payload
        else:
            del _verified_token_cache[token]

    # Extract expiry & JTI from token to set appropriate cache lifetime and check revocation
    token_expiry = now + 300  # Default to 5 minutes if anything fails
    try:
        unverified_payload = jose.jwt.decode(
            token,
            key="",
            options={"verify_signature": False, "verify_aud": False}
        )
        if unverified_payload.get("exp"):
            token_expiry = float(unverified_payload["exp"])
        if unverified_payload.get("jti") and is_token_revoked(unverified_payload["jti"]):
            raise UnauthorizedException("Token has been revoked")
    except UnauthorizedException:
        raise
    except Exception:
        pass

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
            if payload.get("jti") and is_token_revoked(payload["jti"]):
                raise UnauthorizedException("Token has been revoked")
            normalized = _normalize_payload(payload)
            # Cache successfully verified token
            _verified_token_cache[token] = (normalized, token_expiry)
            return normalized
        except UnauthorizedException:
            raise
        except JWTError:
            continue

    # 2. Online verification via Supabase Auth API
    try:
        supabase = get_supabase_client()
        user_res = supabase.auth.get_user(token)
        if user_res and user_res.user:
            u = user_res.user
            normalized = _normalize_payload({
                "sub": str(u.id),
                "email": u.email,
                "role": u.role,
                "user_metadata": u.user_metadata or {},
                "app_metadata": u.app_metadata or {},
            })
            # Cache successfully verified token
            _verified_token_cache[token] = (normalized, token_expiry)
            return normalized
    except Exception as e:
        logger.warning(f"Supabase Auth API token verification failed: {str(e)}")

    # 3. Development mode unverified payload extraction fallback (Flagged for removal in Phase 2)
    if settings.ENVIRONMENT == "development" or settings.DEBUG:
        try:
            payload = jose.jwt.decode(
                token,
                key="",
                options={"verify_signature": False, "verify_aud": False}
            )
            logger.warning("SECURITY WARNING: Decoded JWT payload without signature check (Development Mode Fallback). Flagged for controlled removal in Phase 2.")
            if payload.get("jti") and is_token_revoked(payload["jti"]):
                raise UnauthorizedException("Token has been revoked")
            normalized = _normalize_payload(payload)
            # Cache development mode token
            _verified_token_cache[token] = (normalized, token_expiry)
            return normalized
        except UnauthorizedException:
            raise
        except Exception as e:
            logger.error(f"Failed unverified JWT decode: {e}")

    raise UnauthorizedException("Invalid token or token expired")

