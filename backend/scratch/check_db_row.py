import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config import settings
from supabase import create_client

def check_row():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    print("Querying hrms.employees table for employee_code = 'EMP000014'...")
    res = supabase.schema("hrms").table("employees").select("*").eq("employee_code", "EMP000014").execute()
    rows = res.data or []
    
    if len(rows) == 0:
        print("No row found in hrms.employees with employee_code = 'EMP000014'. Checking by email...")
        res = supabase.schema("hrms").table("employees").select("*").eq("email", "executive@tconnect.com").execute()
        rows = res.data or []
        
    if len(rows) == 0:
        print("No row found by email either.")
        return
        
    print(f"Found {len(rows)} record(s):")
    for idx, row in enumerate(rows):
        print(f"\n--- Record {idx+1} ---")
        for k in sorted(row.keys()):
            print(f"  {k}: {row[k]}")

if __name__ == "__main__":
    check_row()
