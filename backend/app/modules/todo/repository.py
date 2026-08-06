from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.core.logger import logger

# In-memory fallback
_in_memory_todos: List[Dict[str, Any]] = [
    {"id": "todo_001", "title": "Submit Expense Report for client visit", "is_completed": False, "priority": "High", "color": "yellow", "category": "Expense", "created_at": datetime.now().isoformat()},
    {"id": "todo_002", "title": "Call XYZ Builders regarding deal proposal", "is_completed": False, "priority": "Medium", "color": "cyan", "category": "Follow-up", "created_at": datetime.now().isoformat()},
    {"id": "todo_003", "title": "Visit ABC Hospital for product demo", "is_completed": True, "priority": "Medium", "color": "green", "category": "Visit", "created_at": datetime.now().isoformat()},
    {"id": "todo_004", "title": "Upload Customer Documents to CRM portal", "is_completed": False, "priority": "Low", "color": "pink", "category": "Documentation", "created_at": datetime.now().isoformat()},
    {"id": "todo_005", "title": "Send Quotation to DEF Industries", "is_completed": False, "priority": "High", "color": "purple", "category": "Proposal", "created_at": datetime.now().isoformat()},
]


class TodoRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()

    def get_user_todos(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            res = self.supabase.table("todos").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
            if res.data is not None:
                return res.data
        except Exception as e:
            logger.debug(f"Supabase todos fetch notice: {e}")
        return _in_memory_todos

    def get_all_todos(self) -> List[Dict[str, Any]]:
        try:
            res = self.supabase.table("todos").select("*").order("created_at", desc=True).limit(50).execute()
            if res.data is not None:
                return res.data
        except Exception as e:
            logger.debug(f"Supabase todos fetch notice: {e}")
        return _in_memory_todos

    def create_todo(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["id"] = data.get("id") or str(uuid.uuid4())
        data["is_completed"] = data.get("is_completed", False)
        data["created_at"] = datetime.now().isoformat()
        try:
            res = self.supabase.table("todos").insert(data).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.debug(f"Supabase todo insert notice: {e}")
        _in_memory_todos.insert(0, data)
        return data

    def update_todo(self, todo_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            res = self.supabase.table("todos").update(updates).eq("id", todo_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.debug(f"Supabase todo update notice: {e}")
        for todo in _in_memory_todos:
            if todo["id"] == todo_id:
                todo.update(updates)
                return todo
        return None

    def delete_todo(self, todo_id: str) -> bool:
        try:
            self.supabase.table("todos").delete().eq("id", todo_id).execute()
            return True
        except Exception as e:
            logger.debug(f"Supabase todo delete notice: {e}")
        global _in_memory_todos
        _in_memory_todos = [t for t in _in_memory_todos if t["id"] != todo_id]
        return True
