from typing import List, Dict, Any
from app.modules.audit.repository import AuditRepository


class AuditService:
    def __init__(self, repo: AuditRepository = None):
        self.repo = repo or AuditRepository()

    def list_logs(self) -> List[Dict[str, Any]]:
        return self.repo.get_logs()
