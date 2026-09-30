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

    def _standardize_todo(self, t: Dict[str, Any]) -> Dict[str, Any]:
        if not t:
            return {}
        row = dict(t)
        row["color"] = "yellow"
        row["category"] = "General"
        desc = row.get("description") or ""
        if desc.startswith("{") and desc.endswith("}"):
            import json
            try:
                meta = json.loads(desc)
                if isinstance(meta, dict):
                    row["color"] = meta.get("color") or "yellow"
                    row["category"] = meta.get("category") or "General"
            except Exception:
                pass
        return row

    def get_user_todos(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            res = self.supabase.schema("system").table("todos").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
            if res.data is not None:
                return [self._standardize_todo(t) for t in res.data]
        except Exception:
            try:
                res = self.supabase.table("todos").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
                if res.data is not None:
                    return [self._standardize_todo(t) for t in res.data]
            except Exception as e:
                logger.debug(f"todos fetch notice: {e}")
        return [self._standardize_todo(t) for t in _in_memory_todos]

    def get_all_todos(self) -> List[Dict[str, Any]]:
        try:
            res = self.supabase.schema("system").table("todos").select("*").order("created_at", desc=True).limit(50).execute()
            if res.data is not None:
                return [self._standardize_todo(t) for t in res.data]
        except Exception:
            try:
                res = self.supabase.table("todos").select("*").order("created_at", desc=True).limit(50).execute()
                if res.data is not None:
                    return [self._standardize_todo(t) for t in res.data]
            except Exception as e:
                logger.debug(f"todos fetch notice: {e}")
        return [self._standardize_todo(t) for t in _in_memory_todos]

    def create_todo(self, data: Dict[str, Any]) -> Dict[str, Any]:
        todo_id = data.get("id") or str(uuid.uuid4())
        now_iso = datetime.now().isoformat()

        import json
        desc_json = json.dumps({
            "color": data.get("color") or "yellow",
            "category": data.get("category") or "General"
        })

        db_payload = {
            "id": todo_id,
            "user_id": data.get("user_id"),
            "employee_id": data.get("employee_id"),
            "title": data.get("title") or "",
            "description": desc_json,
            "due_date": data.get("due_date"),
            "priority": data.get("priority") or "Medium",
            "is_completed": bool(data.get("is_completed", False)),
            "created_at": now_iso
        }

        # Keep fully enriched legacy object for in-memory
        req_obj = dict(data)
        req_obj["id"] = todo_id
        req_obj["is_completed"] = db_payload["is_completed"]
        req_obj["created_at"] = now_iso

        out_todo = None
        try:
            res = self.supabase.schema("system").table("todos").insert(db_payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"Todo created in system.todos: {res.data[0]}")
                out_todo = self._standardize_todo(res.data[0])
        except Exception as e:
            logger.debug(f"system.todos insert warning: {e}")
            try:
                res = self.supabase.table("todos").insert(db_payload).execute()
                if res.data and len(res.data) > 0:
                    logger.info(f"Todo created in public.todos: {res.data[0]}")
                    out_todo = self._standardize_todo(res.data[0])
            except Exception as e2:
                logger.debug(f"todo insert notice: {e2}")

        if not out_todo:
            _in_memory_todos.insert(0, req_obj)
            out_todo = req_obj

        try:
            from app.modules.notification.repository import NotificationRepository
            from app.modules.notification.helpers import build_notification_url
            recip_id = str(data.get("user_id") or data.get("employee_id") or "").strip()
            recip_email = str(data.get("recipient_email") or data.get("user_email") or "").strip()

            if not recip_email and recip_id:
                try:
                    emp_res = self.supabase.schema("hrms").table("employees").select("email").or_(f"employee_id.eq.{recip_id},user_id.eq.{recip_id}").limit(1).execute()
                    if emp_res.data:
                        recip_email = emp_res.data[0].get("email") or ""
                except Exception:
                    pass

            notif_url = build_notification_url("TASK_ASSIGNED", todo_id, role="sales")
            NotificationRepository().create_notification({
                "recipient_id": recip_id,
                "recipient_email": recip_email,
                "recipient_role": "sales",
                "title": "New Task Assigned",
                "message": f"Task '{data.get('title', 'Todo Item')}' has been created.",
                "type": "TASK_ASSIGNED",
                "url": notif_url,
            })
        except Exception as n_err:
            logger.warning(f"Todo creation notification emission failed: {n_err}")

        return out_todo

    def update_todo(self, todo_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        existing = None
        try:
            res = self.supabase.schema("system").table("todos").select("*").eq("id", todo_id).execute()
            if res.data and len(res.data) > 0:
                existing = res.data[0]
        except Exception:
            try:
                res = self.supabase.table("todos").select("*").eq("id", todo_id).execute()
                if res.data and len(res.data) > 0:
                    existing = res.data[0]
            except Exception:
                pass

        if not existing:
            # Check in-memory
            for todo in _in_memory_todos:
                if todo["id"] == todo_id:
                    todo.update(updates)
                    return todo
            return None

        # Build database conforming update payload
        db_updates = {}
        if "title" in updates:
            db_updates["title"] = updates["title"]
        if "is_completed" in updates:
            db_updates["is_completed"] = bool(updates["is_completed"])
        if "priority" in updates:
            db_updates["priority"] = updates["priority"]
        if "due_date" in updates:
            db_updates["due_date"] = updates["due_date"]

        # Parse existing description to merge color/category
        import json
        desc_meta = {"color": "yellow", "category": "General"}
        existing_desc = existing.get("description") or ""
        if existing_desc.startswith("{") and existing_desc.endswith("}"):
            try:
                m = json.loads(existing_desc)
                if isinstance(m, dict):
                    desc_meta.update(m)
            except Exception:
                pass
        
        meta_changed = False
        if "color" in updates:
            desc_meta["color"] = updates["color"]
            meta_changed = True
        if "category" in updates:
            desc_meta["category"] = updates["category"]
            meta_changed = True

        if meta_changed or "color" in updates or "category" in updates:
            db_updates["description"] = json.dumps(desc_meta)

        try:
            res = self.supabase.schema("system").table("todos").update(db_updates).eq("id", todo_id).execute()
            if res.data and len(res.data) > 0:
                return self._standardize_todo(res.data[0])
        except Exception:
            try:
                res = self.supabase.table("todos").update(db_updates).eq("id", todo_id).execute()
                if res.data and len(res.data) > 0:
                    return self._standardize_todo(res.data[0])
            except Exception as e:
                logger.debug(f"todo update notice: {e}")

        # Fallback to in-memory
        for todo in _in_memory_todos:
            if todo["id"] == todo_id:
                todo.update(updates)
                return todo
        return None

    def delete_todo(self, todo_id: str) -> bool:
        try:
            self.supabase.schema("system").table("todos").delete().eq("id", todo_id).execute()
            return True
        except Exception:
            try:
                self.supabase.table("todos").delete().eq("id", todo_id).execute()
                return True
            except Exception as e:
                logger.debug(f"todo delete notice: {e}")
        global _in_memory_todos
        _in_memory_todos = [t for t in _in_memory_todos if t["id"] != todo_id]
        return True
