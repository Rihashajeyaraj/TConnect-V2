from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from typing import List, Optional, Dict, Any
import io
import csv
from app.core.dependencies import get_current_user_payload
from app.modules.holidays.repository import HolidayRepository
from app.modules.audit.service import create_audit_log

router = APIRouter(prefix="/holidays", tags=["holidays"])
repo = HolidayRepository()

@router.get("", response_model=List[Dict[str, Any]])
def get_holidays(
    year: Optional[int] = Query(None),
    active_only: bool = Query(True),
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Retrieve holidays for HRMS calendar."""
    return repo.get_holidays(year=year, active_only=active_only)

@router.post("", status_code=status.HTTP_201_CREATED)
def create_holiday(
    holiday_data: Dict[str, Any],
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Create a new holiday record (Admin/Manager only)."""
    user_role = str(user_payload.get("role") or "").lower()
    if not any(r in user_role for r in ["admin", "ceo", "manager"]):
        raise HTTPException(status_code=403, detail="Only HR Managers or Admin can create holidays")

    user_email = str(user_payload.get("email") or "")
    created = repo.create_holiday(holiday_data, user_email=user_email)
    try:
        create_audit_log(
            "HOLIDAY_CREATED", "hrms.holidays", user_payload,
            entity_id=created.get("id", ""), module="HRMS",
            description=f"Created holiday: {created.get('name') or created.get('title')}"
        )
    except Exception:
        pass
    return created

@router.post("/upload-excel", status_code=status.HTTP_201_CREATED)
async def upload_excel_holidays(
    file: Optional[UploadFile] = File(None),
    holidays_json: Optional[List[Dict[str, Any]]] = None,
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Bulk import holidays via Excel/CSV file upload or JSON payload (Admin/Manager only)."""
    user_role = str(user_payload.get("role") or "").lower()
    if not any(r in user_role for r in ["admin", "ceo", "manager"]):
        raise HTTPException(status_code=403, detail="Only HR Managers or Admin can upload holiday schedules")

    user_email = str(user_payload.get("email") or "")
    holidays_to_import = []

    if file:
        filename = (file.filename or "").lower()
        content = await file.read()
        if filename.endswith(".csv"):
            csv_text = content.decode("utf-8-sig", errors="ignore")
            reader = csv.DictReader(io.StringIO(csv_text))
            for row in reader:
                h_name = row.get("Holiday") or row.get("Holiday Name") or row.get("Name") or row.get("TITLE") or row.get("title")
                h_date = row.get("Date") or row.get("DATE") or row.get("date")
                if h_name and h_date:
                    holidays_to_import.append({
                        "name": str(h_name).strip(),
                        "date": str(h_date).strip(),
                        "location": str(row.get("Location") or row.get("LOCATION") or "All").strip(),
                        "type": str(row.get("Type") or row.get("TYPE") or "Mandatory").strip(),
                        "description": str(row.get("Description") or row.get("Note") or "").strip(),
                    })
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            try:
                import openpyxl
                wb = openpyxl.load_workbook(filename=io.BytesIO(content), data_only=True)
                sheet = wb.active
                headers = [str(cell.value or "").strip() for cell in sheet[1]]
                for row in sheet.iter_rows(min_row=2, values_only=True):
                    row_dict = dict(zip(headers, row))
                    h_name = row_dict.get("Holiday") or row_dict.get("Holiday Name") or row_dict.get("Name") or row_dict.get("Title")
                    h_date = row_dict.get("Date") or row_dict.get("DATE")
                    if h_name and h_date:
                        date_str = str(h_date).split(" ")[0] if " " in str(h_date) else str(h_date)
                        holidays_to_import.append({
                            "name": str(h_name).strip(),
                            "date": date_str.strip(),
                            "location": str(row_dict.get("Location") or row_dict.get("LOCATION") or "All").strip(),
                            "type": str(row_dict.get("Type") or row_dict.get("TYPE") or "Mandatory").strip(),
                            "description": str(row_dict.get("Description") or row_dict.get("Note") or "").strip(),
                        })
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed parsing Excel file: {str(e)}")

    if holidays_json and isinstance(holidays_json, list):
        holidays_to_import.extend(holidays_json)

    if not holidays_to_import:
        raise HTTPException(status_code=400, detail="No valid holiday records found in upload")

    created = repo.bulk_create_holidays(holidays_to_import, user_email=user_email)
    try:
        create_audit_log(
            "HOLIDAYS_BULK_UPLOAD", "hrms.holidays", user_payload,
            entity_id=f"BULK-{len(created)}", module="HRMS",
            description=f"Bulk imported {len(created)} holiday records"
        )
    except Exception:
        pass

    return {"imported": len(created), "records": created}

@router.post("/adhoc", status_code=status.HTTP_201_CREATED)
def create_adhoc_holiday(
    data: Dict[str, Any],
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Declare an additional / emergency leave (e.g. Floods, Elections, Disasters). Sends alert to all employees."""
    user_role = str(user_payload.get("role") or "").lower()
    if not any(r in user_role for r in ["admin", "ceo", "manager"]):
        raise HTTPException(status_code=403, detail="Only HR Managers or Admin can declare ad-hoc leaves")

    user_email = str(user_payload.get("email") or "")
    created = repo.create_adhoc_holiday(data, user_email=user_email)
    try:
        create_audit_log(
            "ADHOC_HOLIDAY_DECLARED", "hrms.holidays", user_payload,
            entity_id=created.get("id", ""), module="HRMS",
            description=f"Declared emergency holiday: {created.get('name')} for {created.get('location')}"
        )
    except Exception:
        pass

    return created

@router.put("/{holiday_id}")
def update_holiday(
    holiday_id: str,
    holiday_data: Dict[str, Any],
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Update existing holiday details."""
    user_role = str(user_payload.get("role") or "").lower()
    if not any(r in user_role for r in ["admin", "ceo", "manager"]):
        raise HTTPException(status_code=403, detail="Only HR Managers or Admin can edit holidays")

    updated = repo.update_holiday(holiday_id, holiday_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Holiday not found")

    try:
        create_audit_log(
            "HOLIDAY_UPDATED", "hrms.holidays", user_payload,
            entity_id=holiday_id, module="HRMS",
            description=f"Updated holiday ID: {holiday_id}"
        )
    except Exception:
        pass
    return updated

@router.delete("/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holiday(
    holiday_id: str,
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Delete or deactivate a holiday record."""
    user_role = str(user_payload.get("role") or "").lower()
    if not any(r in user_role for r in ["admin", "ceo", "manager"]):
        raise HTTPException(status_code=403, detail="Only HR Managers or Admin can delete holidays")

    success = repo.delete_holiday(holiday_id)
    if not success:
        raise HTTPException(status_code=404, detail="Holiday not found")

    try:
        create_audit_log(
            "HOLIDAY_DELETED", "hrms.holidays", user_payload,
            entity_id=holiday_id, module="HRMS",
            description=f"Deleted holiday ID: {holiday_id}"
        )
    except Exception:
        pass
    return None

