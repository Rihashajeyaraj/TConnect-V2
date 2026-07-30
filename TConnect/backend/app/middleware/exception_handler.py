from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.schemas.response import StandardResponse, ErrorDetail
from app.exceptions.base import AppException
from app.core.logger import logger


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    logger.error(f"AppException [{exc.error_code}] on {request.url.path}: {exc.message}")
    error_details = [ErrorDetail(code=exc.error_code, message=exc.message)]
    response = StandardResponse.error_response(
        message=exc.message,
        errors=error_details
    )
    return JSONResponse(status_code=exc.status_code, content=response.model_dump())


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.warning(f"ValidationError on {request.url.path}: {exc.errors()}")
    error_details = []
    for err in exc.errors():
        field = ".".join([str(x) for x in err.get("loc", []) if x not in ("body", "query", "path")])
        error_details.append(
            ErrorDetail(
                code="VALIDATION_ERROR",
                message=err.get("msg", "Invalid value"),
                field=field if field else None
            )
        )
    
    response = StandardResponse.error_response(
        message="Request parameters or body validation failed.",
        errors=error_details
    )
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=response.model_dump())


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(f"Unhandled Exception on {request.url.path}: {str(exc)}")
    response = StandardResponse.error_response(
        message="An unexpected internal server error occurred. Please try again later.",
        errors=[ErrorDetail(code="INTERNAL_SERVER_ERROR", message="Internal Server Error")]
    )
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=response.model_dump())
