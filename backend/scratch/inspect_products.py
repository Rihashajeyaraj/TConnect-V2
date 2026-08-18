import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.supabase import get_supabase_admin_client

def main():
    client = get_supabase_admin_client()
    if not client:
        print("Failed to init admin client")
        return
        
    try:
        res = client.schema("organization").table("products").select("*").execute()
        print(f"Products in DB: {res.data}")
    except Exception as e:
        print(f"Error fetching products: {e}")

if __name__ == "__main__":
    main()
