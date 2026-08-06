import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath("."))

def run_tests():
    print("==================================================")
    print("RUNNING CRITICAL AUTHENTICATION BUG VERIFICATION")
    print("==================================================\n")

    from app.modules.auth.service import AuthService
    from app.modules.auth.schemas import LoginRequest
    from app.exceptions.base import UnauthorizedException
    from app.modules.users.repository import UserRepository

    service = AuthService()

    # 1. Correct Email + Correct Password
    res1 = service.login(LoginRequest(email="executive@tconnect.com", password="SalesPassword2026#"))
    assert "access_token" in res1, "Expected access_token in response"
    print("[PASS] Scenario 1: Correct Email + Correct Password -> Login Success")

    # 2. Correct Email + Wrong Password
    try:
        service.login(LoginRequest(email="executive@tconnect.com", password="WRONG_PASSWORD_123"))
        assert False, "Should have raised UnauthorizedException"
    except UnauthorizedException as exc:
        assert "Invalid Username or Password" in str(exc)
        print("[PASS] Scenario 2: Correct Email + Wrong Password -> Login Failed (UnauthorizedException)")

    # 3. Wrong Email + Correct Password
    try:
        service.login(LoginRequest(email="nonexistent@tconnect.com", password="SalesPassword2026#"))
        assert False, "Should have raised UnauthorizedException"
    except UnauthorizedException as exc:
        assert "Invalid Username or Password" in str(exc)
        print("[PASS] Scenario 3: Wrong Email + Correct Password -> Login Failed (UnauthorizedException)")

    # 4. Wrong Email + Wrong Password
    try:
        service.login(LoginRequest(email="fakeuser@domain.com", password="wrong_password"))
        assert False, "Should have raised UnauthorizedException"
    except UnauthorizedException as exc:
        assert "Invalid Username or Password" in str(exc)
        print("[PASS] Scenario 4: Wrong Email + Wrong Password -> Login Failed (UnauthorizedException)")

    # 5. Admin creates new user with specific password
    user_repo = UserRepository()
    test_user_email = f"test_new_user_{os.urandom(4).hex()}@tconnect.com"
    test_user_pass = "MySecretPass2026#"
    new_user = user_repo.create_user({
        "name": "Test User",
        "email": test_user_email,
        "password": test_user_pass,
        "role": "Sales Executive",
        "status": "Active"
    })
    print(f"\n[Created Test User] {test_user_email} with password '{test_user_pass}'")

    # 5a. Admin-created User + Correct Password -> Success
    res5a = service.login(LoginRequest(email=test_user_email, password=test_user_pass))
    assert "access_token" in res5a, "Expected access_token in response"
    print("[PASS] Scenario 5a: Admin Created User + Correct Password -> Login Success")

    # 5b. Admin-created User + WRONG Password -> Failed
    try:
        service.login(LoginRequest(email=test_user_email, password="INCORRECT_PASSWORD"))
        assert False, "Should have raised UnauthorizedException"
    except UnauthorizedException as exc:
        assert "Invalid Username or Password" in str(exc)
        print("[PASS] Scenario 5b: Admin Created User + WRONG Password -> Login Failed (UnauthorizedException)")

    # 6. Disabled / Inactive User -> Failed
    user_repo.update_user(new_user["id"], {"status": "Disabled"})
    try:
        service.login(LoginRequest(email=test_user_email, password=test_user_pass))
        assert False, "Should have raised UnauthorizedException"
    except UnauthorizedException as exc:
        assert "disabled" in str(exc).lower() or "inactive" in str(exc).lower() or "invalid" in str(exc).lower()
        print("[PASS] Scenario 6: Disabled User + Correct Password -> Login Failed (UnauthorizedException)")

    print("\n==================================================")
    print("ALL 6 AUTHENTICATION SECURITY TEST SCENARIOS PASSED PERFECTLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
