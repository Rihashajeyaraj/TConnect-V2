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

    def update_user_password(self, user_id: str, new_password: str) -> bool:
        """Update a Supabase user's password via admin client (no email confirmation needed)."""
        if not self.admin_supabase:
            return False
        try:
            self.admin_supabase.auth.admin.update_user_by_id(
                user_id,
                {"password": new_password}
            )
            return True
        except Exception:
            return False

    def get_supabase_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Lookup a Supabase Auth user by email using admin client."""
        if not self.admin_supabase:
            return None
        try:
            # Supabase admin: list users and filter by email
            res = self.admin_supabase.auth.admin.list_users()
            users = res if isinstance(res, list) else getattr(res, "users", [])
            for u in users:
                u_email = getattr(u, "email", None) or (u.get("email") if isinstance(u, dict) else None)
                if u_email and str(u_email).strip().lower() == email.strip().lower():
                    u_id = getattr(u, "id", None) or (u.get("id") if isinstance(u, dict) else None)
                    return {"id": str(u_id), "email": str(u_email)}
        except Exception:
            pass
        return None

