import sys
import os
sys.path.insert(0, os.path.abspath("."))
from app.modules.hrms.repository import HRMSRepository

repo = HRMSRepository()
test_data = {
    "name": "Arun Kumar",
    "email": "arun.k@tconnect.com",
    "phone": "+91 98765 88990",
    "role": "Sales Executive",
    "department": "Sales & Business Development",
    "status": "Active"
}

print("--- TESTING HRMS REPOSITORY CREATE ---")
try:
    result = repo.create_employee(test_data)
    print("RESULT:", result)
except Exception as e:
    print("ERROR:", type(e), e)
