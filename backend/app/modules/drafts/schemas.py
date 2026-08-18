from pydantic import BaseModel
from typing import Dict, Any, Optional

class DraftSave(BaseModel):
    form_key: str
    record_id: Optional[str] = "new"
    draft_data: Dict[str, Any]

class DraftResponse(BaseModel):
    id: str
    user_id: str
    form_key: str
    record_id: str
    draft_data: Dict[str, Any]
    created_at: str
    updated_at: str
