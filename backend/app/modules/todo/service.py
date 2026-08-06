from typing import List, Dict, Any, Optional
from app.modules.todo.repository import TodoRepository
from app.modules.todo.schemas import TodoCreate, TodoUpdate


class TodoService:
    def __init__(self, repo: TodoRepository = None):
        self.repo = repo or TodoRepository()

    def list_todos(self, user_id: str) -> List[Dict[str, Any]]:
        return self.repo.get_user_todos(user_id)

    def create_todo(self, data: TodoCreate, user_id: str) -> Dict[str, Any]:
        payload = data.model_dump()
        payload["user_id"] = user_id
        return self.repo.create_todo(payload)

    def update_todo(self, todo_id: str, data: TodoUpdate) -> Optional[Dict[str, Any]]:
        updates = data.model_dump(exclude_unset=True)
        return self.repo.update_todo(todo_id, updates)

    def delete_todo(self, todo_id: str) -> bool:
        return self.repo.delete_todo(todo_id)
