from typing import Generic, TypeVar, Optional, List, Any
from pydantic import BaseModel

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    field: Optional[str] = None


class StandardResponse(BaseModel, Generic[T]):
    success: bool
    message: str
    data: Optional[T] = None
    errors: Optional[List[ErrorDetail]] = None

    @classmethod
    def success_response(cls, data: Any = None, message: str = "Operation completed successfully"):
        return cls(success=True, message=message, data=data, errors=None)

    @classmethod
    def error_response(cls, message: str = "An error occurred", errors: Optional[List[ErrorDetail]] = None):
        return cls(success=False, message=message, data=None, errors=errors)
