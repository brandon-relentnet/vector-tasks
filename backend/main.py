import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, UTC
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import text
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import sio_app, engine
from exceptions import http_exception_handler, validation_exception_handler, general_exception_handler
from routes.projects import router as projects_router
from routes.tasks import router as tasks_router
from routes.daily_log import router as daily_log_router

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

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
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add rate limiter to app state
app.state.limiter = limiter

# Exception handler for rate limiting
@app.exception_handler(RateLimitExceeded)
async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded):
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

# CORS Configuration - handle duplicates and whitespace
cors_env = os.getenv("CORS_ORIGINS", "http://localhost:3000")
origins = list(dict.fromkeys(o.strip() for o in cors_env.split(",") if o.strip()))

# Custom CORS middleware that excludes /socket.io (handled by socket.io's own CORS)
@app.middleware("http")
async def custom_cors_middleware(request: Request, call_next):
    # Skip CORS for socket.io - socket.io handles its own CORS
    if request.url.path.startswith("/socket.io"):
        response = await call_next(request)
        return response

    # Apply CORS headers manually
    response = await call_next(request)

    origin = request.headers.get("origin")
    if origin in origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"

    return response

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start

    # Log all API requests (exclude static and socket.io)
    if not request.url.path.startswith(("/static", "/assets", "/socket.io")):
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
        "docs": "/docs",
        "openapi": "/openapi.json"
    }
