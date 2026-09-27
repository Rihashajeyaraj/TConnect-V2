import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import time
from app.core.security import (

    hash_password,
    verify_password,
    generate_reset_token,
    hash_token,
    generate_jti,
    create_access_token,
    verify_supabase_jwt,
    is_token_revoked,
    revoke_token,
)
from app.exceptions.base import UnauthorizedException


def test_password_hashing():
    raw_password = "SecurePassword2026#"
    hashed = hash_password(raw_password)

    # 1. Hashed password is not raw password
    assert hashed != raw_password
    assert hashed.startswith("$2")

    # 2. Correct password verifies
    assert verify_password(raw_password, hashed) is True

    # 3. Incorrect password fails
    assert verify_password("WrongPassword123#", hashed) is False
    assert verify_password("", hashed) is False


def test_reset_tokens():
    token1 = generate_reset_token()
    token2 = generate_reset_token()

    # 1. Generated tokens are random and unique
    assert token1 != token2
    assert len(token1) >= 40

    # 2. Token hashing produces SHA-256 hex string (64 characters)
    hashed1 = hash_token(token1)
    hashed2 = hash_token(token1)

    assert hashed1 == hashed2  # Deterministic hash
    assert len(hashed1) == 64
    assert hashed1 != token1


def test_jwt_generation_and_jti():
    data = {"sub": "EMP001", "email": "test@tconnect.com", "role": "Sales Executive"}
    token = create_access_token(data)

    # 1. Token is string
    assert isinstance(token, str)
    assert len(token) > 20

    # 2. Verification returns normalized payload with JTI
    payload = verify_supabase_jwt(token)
    assert payload["email"] == "test@tconnect.com"
    assert "jti" in payload
    assert len(payload["jti"]) > 10


def test_token_revocation():
    jti = generate_jti()
    token = create_access_token({"sub": "EMP002", "email": "revoketest@tconnect.com", "jti": jti})

    # 1. Non-revoked JTI passes
    assert is_token_revoked(jti) is False
    payload = verify_supabase_jwt(token)
    assert payload["email"] == "revoketest@tconnect.com"

    # 2. Revoking JTI rejects token
    revoke_token(jti, user_id="EMP002")
    assert is_token_revoked(jti) is True

    rejected = False
    try:
        verify_supabase_jwt(token)
    except UnauthorizedException:
        rejected = True
    assert rejected is True, "Expected UnauthorizedException when verifying a revoked token"


if __name__ == "__main__":
    print("Running Phase 1 security tests...")
    test_password_hashing()
    print("[PASS] Password hashing test passed")
    test_reset_tokens()
    print("[PASS] Reset token test passed")
    test_jwt_generation_and_jti()
    print("[PASS] JWT & JTI test passed")
    test_token_revocation()
    print("[PASS] Token revocation test passed")
    print("\nALL PHASE 1 SECURITY TESTS PASSED SUCCESSFULLY!")

