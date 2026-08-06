from fastapi import APIRouter, Depends, status
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.todo.schemas import TodoCreate, TodoUpdate
from app.modules.todo.service import TodoService
from app.modules.todo.permissions import CanManageTodos

router = APIRouter(prefix="/todo", tags=["To-Do"])


def get_service() -> TodoService:
    return TodoService()


@router.get("", response_model=StandardResponse)
async def list_todos(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageTodos),
    service: TodoService = Depends(get_service)
):
    """Retrieve all to-do items for the current user."""
    user_id = user_payload.get("sub", "user_001")
    todos = service.list_todos(user_id)
    return StandardResponse.success_response(
        data=todos,
        message="To-do items retrieved successfully"
    )


@router.post("", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def create_todo(
    data: TodoCreate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageTodos),
    service: TodoService = Depends(get_service)
):
    """Create a new to-do item."""
    user_id = user_payload.get("sub", "user_001")
    todo = service.create_todo(data, user_id)
    return StandardResponse.success_response(
        data=todo,
        message="To-do item created successfully",
    )


@router.patch("/{todo_id}", response_model=StandardResponse)
async def update_todo(
    todo_id: str,
    data: TodoUpdate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageTodos),
    service: TodoService = Depends(get_service)
):
    """Update a to-do item (toggle completion, change priority, etc.)."""
    todo = service.update_todo(todo_id, data)
    return StandardResponse.success_response(
        data=todo,
        message="To-do item updated successfully"
    )


@router.delete("/{todo_id}", response_model=StandardResponse)
async def delete_todo(
    todo_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageTodos),
    service: TodoService = Depends(get_service)
):
    """Delete a to-do item."""
    service.delete_todo(todo_id)
    return StandardResponse.success_response(
        data={"deleted": todo_id},
        message="To-do item deleted successfully"
    )
