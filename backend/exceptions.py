from typing import Optional
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import ValidationError

class APIError(Exception):
    """Custom API error with structured response"""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[dict] = None
    ):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details
        super().__init__(self.message)

# Common error codes
class ErrorCodes:
    NOT_FOUND = "RESOURCE_NOT_FOUND"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    CONFLICT = "RESOURCE_CONFLICT"
    SERVER_ERROR = "INTERNAL_ERROR"
    RATE_LIMITED = "RATE_LIMIT_EXCEEDED"

# Predefined errors
class NotFoundError(APIError):
    def __init__(self, resource: str, resource_id: int):
        super().__init__(
            status_code=404,
            code=ErrorCodes.NOT_FOUND,
            message=f"{resource} with id {resource_id} not found",
            details={"resource": resource, "id": resource_id}
        )

class ConflictError(APIError):
    def __init__(self, message: str):
        super().__init__(
            status_code=409,
            code=ErrorCodes.CONFLICT,
            message=message
        )

async def api_exception_handler(request: Request, exc: APIError):
    """Handle custom APIError exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )

async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle FastAPI HTTPException"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": "HTTP_ERROR",
                "message": str(exc.detail) if hasattr(exc, 'detail') else "HTTP error occurred"
            }
        }
    )

async def validation_exception_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors"""
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": ErrorCodes.VALIDATION_ERROR,
                "message": "Request validation failed",
                "details": exc.errors()
            }
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions"""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": ErrorCodes.SERVER_ERROR,
                message: "An internal error occurred"
            }
        }
    )
