from typing import Dict, Any, Optional
from app.database.supabase import get_supabase_client, get_supabase_admin_client


class AuthRepository:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.admin_supabase = get_supabase_admin_client()

    def sign_in_with_password(self, email: str, password: str) -> Dict[str, Any]:
        res = self.supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        return res

    def sign_up(self, email: str, password: str) -> Dict[str, Any]:
        if self.admin_supabase:
            try:
                res = self.admin_supabase.auth.admin.create_user({
                    "email": email,
                    "password": password,
                    "email_confirm": True
                })
                return res
            except Exception:
                pass

        return self.supabase.auth.sign_up({
            "email": email,
            "password": password
        })
