import sys
import os
import uuid
import traceback

sys.path.insert(0, os.path.abspath("."))
from app.modules.users.repository import UserRepository

print("--- DEBUGGING USER CREATION DIRECTLY VIA USER REPOSITORY ---")

repo = UserRepository()
test_user = {
    "name": "Live Test Account",
    "email": f"livetest.{uuid.uuid4().hex[:6]}@twiteconnect.com",
    "phone": "+91 98765 99999",
    "password": "LivePassword2026#",
    "role": "Sales Executive",
    "dept": "Sales & Business Development",
    "status": "Active"
}

try:
    res = repo.create_user(test_user)
    print("🎉 REPOSITORY CREATED USER RESULT:", res)
except Exception as e:
    print("❌ REPOSITORY CREATED USER EXCEPTION:")
    traceback.print_exc()
