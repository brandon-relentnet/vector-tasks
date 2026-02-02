import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, UTC
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import text
from slowapi import Limiter, RequestRateLimitExceeded
from slowapi.util import get_remote_address

from database import sio_app, engine
from exceptions import api_exception_handler, http_exception_handler, validation_exception_handler, general_exception_handler
from routes.projects import router as projects_router
from routes.tasks import router as tasks_router
from routes.daily_log import router as daily_log_router

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# Request timing middleware
async def log_requests_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start

    if request.url.path.startswith("/api/v1"):
        print(f"[{request.method}] {request.url.path} - {response.status_code} ({duration:.3f}s)")

    return response

# Startup event
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: validate connections
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Database connection: OK")
    except Exception as e:
        print(f"Database connection: FAILED - {e}")

    yield
    print("Shutting down...")

# Create FastAPI app
app = FastAPI(
    title="Vector Tasks API",
    description="Gamified task management API with projects, tasks, and daily logs",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# Add rate limiter to app state
app.state.limiter = limiter

# Exception handler for rate limiting
@app.exception_handler(RequestRateLimitExceeded)
async def rate_limit_exception_handler(request: Request, exc: RequestRateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests. Please try again later.",
                "details": {"retry_after": exc.detail}
            }
        }
    )

# CORS Configuration
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start

    if request.url.path.startswith("/api/v1"):
        print(f"[{request.method}] {request.url.path} - {response.status_code} ({duration:.3f}s)")

    return response

# Mount Socket.IO
app.mount("/socket.io", sio_app)

# Register exception handlers
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(ValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include routers
app.include_router(projects_router)
app.include_router(tasks_router)
app.include_router(daily_log_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "timestamp": datetime.now(UTC).isoformat()}

# Root redirect to docs
@app.get("/")
async def root():
    return {
        "message": "Vector Tasks API",
        "docs": "/api/docs",
        "version": "2.0.0"
    }
