import os
import sys
import json
from supabase import create_client

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config import settings

def run_query():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    # Query hrms.employees table
    res = supabase.schema("hrms").table("employees").select("*").eq("employee_code", "EMP000014").execute()
    data = res.data or []
    
    output_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "profile_data.json"))
    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)
        
if __name__ == "__main__":
    run_query()
