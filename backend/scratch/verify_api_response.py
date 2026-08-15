import os
import sys
import httpx

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.modules.auth.service import AuthService
from app.modules.auth.schemas import DevTokenRequest

def verify_response():
    auth_service = AuthService()
    
    # 1. Generate dev token for test employee
    print("Generating JWT dev token for executive@tconnect.com...")
    token_res = auth_service.generate_dev_token(
        DevTokenRequest(email="executive@tconnect.com", role="Sales Executive")
    )
    token = token_res["access_token"]
    user_data = token_res["user"]
    emp_code = user_data["employee_code"]
    print(f"Token generated successfully. Employee code: {emp_code}")

    # 2. Make GET request to FastAPI server running on http://127.0.0.1:8000
    headers = {"Authorization": f"Bearer {token}"}
    url = f"http://127.0.0.1:8000/api/v1/hrms/employees/{emp_code}"
    print(f"Sending GET request to: {url}")
    
    try:
        res = httpx.get(url, headers=headers)
        print(f"Response status code: {res.status_code}")
        if res.status_code == 200:
            json_data = res.json()
            print("API response payload returned successfully.")
            data_dict = json_data.get("data", {})
            print("Keys present in API response data block:")
            for key in sorted(data_dict.keys()):
                print(f"  - {key}: {data_dict[key]}")
        else:
            print(f"API returned error: {res.text}")
    except Exception as e:
        print(f"Failed to connect or request: {e}")

if __name__ == "__main__":
    verify_response()
