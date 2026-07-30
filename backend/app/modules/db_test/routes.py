from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
import time
from app.schemas.response import StandardResponse
from app.database.supabase import get_supabase_client

router = APIRouter(prefix="/db-test", tags=["Database Storage Test"])


class TestRecord(BaseModel):
    title: str = "Test Storage Item"
    description: Optional[str] = "Testing DB write and read functionality"
    meta: Optional[Dict[str, Any]] = {"source": "Swagger UI"}


_in_memory_db = []


@router.post("/store", response_model=StandardResponse)
async def store_test_data(record: TestRecord):
    """
    Store a test record in the Supabase database.
    Tests real DB write capability and reports exact storage status.
    """
    item = {
        "title": record.title,
        "description": record.description,
        "meta": record.meta,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    stored_in_supabase = False
    supabase_error = None

    try:
        supabase = get_supabase_client()
        res = supabase.table("test_records").insert(item).execute()
        if res.data:
            item = res.data[0]
            stored_in_supabase = True
    except Exception as e:
        supabase_error = str(e)
        _in_memory_db.append(item)

    return StandardResponse.success_response(
        data={
            "record": item,
            "stored_in_supabase": stored_in_supabase,
            "details": (
                "Successfully stored row in Supabase PostgreSQL 'test_records' table!"
                if stored_in_supabase
                else f"Supabase Table Notice: {supabase_error}. (Record saved to temporary backend store)."
            )
        },
        message="Database write test executed"
    )


@router.get("/records", response_model=StandardResponse)
async def get_test_data():
    """
    Fetch all stored records from Supabase database to verify read capability.
    """
    try:
        supabase = get_supabase_client()
        res = supabase.table("test_records").select("*").execute()
        return StandardResponse.success_response(
            data={
                "supabase_records": res.data,
                "total_records": len(res.data),
                "storage_engine": "Supabase PostgreSQL Database"
            },
            message="Retrieved records from Supabase database successfully"
        )
    except Exception as e:
        return StandardResponse.success_response(
            data={
                "records": _in_memory_db,
                "total_records": len(_in_memory_db),
                "storage_engine": "Backend Memory (Supabase 'test_records' table pending SQL creation)",
                "error_details": str(e)
            },
            message="Read test completed"
        )
