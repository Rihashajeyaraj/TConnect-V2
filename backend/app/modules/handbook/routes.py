from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from app.core.dependencies import get_current_user_payload
from app.modules.handbook.repository import HandbookRepository
from app.modules.audit.service import create_audit_log

router = APIRouter(prefix="/handbook", tags=["handbook"])
repo = HandbookRepository()

@router.get("", response_model=List[Dict[str, Any]])
def get_published_handbook(user_payload: Dict[str, Any] = Depends(get_current_user_payload)):
    """Retrieve published handbook and policy documents for employees."""
    return repo.get_published_documents()

@router.get("/admin", response_model=List[Dict[str, Any]])
def get_all_handbook_documents(user_payload: Dict[str, Any] = Depends(get_current_user_payload)):
    """Retrieve all handbook documents including drafts (Admin/Manager only)."""
    user_role = str(user_payload.get("role") or "").lower()
    if not any(r in user_role for r in ["admin", "ceo", "manager"]):
        raise HTTPException(status_code=403, detail="Unauthorized to access draft handbook documents")

    return repo.get_all_documents()

@router.post("", status_code=status.HTTP_201_CREATED)
def create_handbook_document(
    doc_data: Dict[str, Any],
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Create a new policy or handbook document draft."""
    user_role = str(user_payload.get("role") or "").lower()
    if not any(r in user_role for r in ["admin", "ceo", "manager"]):
        raise HTTPException(status_code=403, detail="Only HR Managers or Admin can create policy documents")

    created = repo.create_document(doc_data)
    try:
        create_audit_log(
            "HANDBOOK_CREATED", "organization.handbook_documents", user_payload,
            entity_id=created.get("id", ""), module="Organization",
            description=f"Created handbook document: {created.get('title')}"
        )
    except Exception:
        pass
    return created

@router.put("/{doc_id}")
def update_handbook_document(
    doc_id: str,
    doc_data: Dict[str, Any],
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Update an existing handbook document."""
    user_role = str(user_payload.get("role") or "").lower()
    if not any(r in user_role for r in ["admin", "ceo", "manager"]):
        raise HTTPException(status_code=403, detail="Only HR Managers or Admin can update policy documents")

    updated = repo.update_document(doc_id, doc_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        create_audit_log(
            "HANDBOOK_UPDATED", "organization.handbook_documents", user_payload,
            entity_id=doc_id, module="Organization",
            description=f"Updated handbook document ID: {doc_id}"
        )
    except Exception:
        pass
    return updated

@router.post("/{doc_id}/publish")
def publish_handbook_document(
    doc_id: str,
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Publish a draft handbook document to make it visible to all employees."""
    user_role = str(user_payload.get("role") or "").lower()
    if not any(r in user_role for r in ["admin", "ceo", "manager"]):
        raise HTTPException(status_code=403, detail="Only HR Managers or Admin can publish policy documents")

    published = repo.publish_document(doc_id)
    if not published:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        create_audit_log(
            "HANDBOOK_PUBLISHED", "organization.handbook_documents", user_payload,
            entity_id=doc_id, module="Organization",
            description=f"Published handbook document ID: {doc_id}"
        )
    except Exception:
        pass
    return published
