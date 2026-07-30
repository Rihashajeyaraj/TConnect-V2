from typing import Optional, Dict, Any
from pydantic import BaseModel


class UserModel(BaseModel):
    id: str
    email: str
    role: str = "Sales Executive"
    user_metadata: Optional[Dict[str, Any]] = None
