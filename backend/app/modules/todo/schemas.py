from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class TodoCreate(BaseModel):
    title: str
    priority: Optional[str] = "Medium"   # High | Medium | Low
    due_date: Optional[str] = None
    color: Optional[str] = "yellow"     # yellow | pink | cyan | green | purple
    category: Optional[str] = "General"


class TodoUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None
    priority: Optional[str] = None
    color: Optional[str] = None
    category: Optional[str] = None


class TodoResponse(BaseModel):
    id: str
    title: str
    is_completed: bool = False
    priority: str = "Medium"
    due_date: Optional[str] = None
    color: Optional[str] = "yellow"
    category: Optional[str] = "General"
    created_at: Optional[str] = None
