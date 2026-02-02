import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, UTC
from typing import List, Optional
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import sio_app, engine, get_db, cache_service, notify_dashboard
from models import Project, Task, DailyLog, get_local_date
from schemas import ProjectOut, TaskOut, TaskUpdate, DailyLogOut, DailyLogUpdate, ProjectCreate
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

# =============================================================================
# LEGACY ROUTES - Backward compatibility with existing frontend
# These routes support the old API paths without /api/v1/ prefix
# =============================================================================

@app.get("/projects", response_model=List[ProjectOut])
def legacy_get_projects(db: Session = Depends(get_db)):
    """Legacy: Get all projects"""
    return projects_router.routes[0].endpoint(db)  # Reuse v1 handler

@app.get("/tasks", response_model=List[TaskOut])
def legacy_get_tasks(db: Session = Depends(get_db)):
    """Legacy: Get all tasks"""
    return tasks_router.routes[0].endpoint(db)  # Reuse v1 handler

@app.get("/daily-log", response_model=Optional[DailyLogOut])
def legacy_get_daily_log(db: Session = Depends(get_db)):
    """Legacy: Get today's daily log"""
    return daily_log_router.routes[0].endpoint(db)  # Reuse v1 handler

@app.get("/daily-log/history", response_model=List[DailyLogOut])
def legacy_get_daily_log_history(
    limit: int = 10,
    offset: int = 0,
    has_morning: bool = None,
    has_night: bool = None,
    db: Session = Depends(get_db)
):
    """Legacy: Get daily log history"""
    return daily_log_router.routes[2].endpoint(limit, offset, has_morning, has_night, db)

@app.post("/daily-log/update", response_model=Optional[DailyLogOut])
async def legacy_update_daily_log(log_update: dict, db: Session = Depends(get_db)):
    """Legacy: Update daily log - accepts any dict for backward compatibility"""
    today = get_local_date()
    db_log = db.query(DailyLog).filter(DailyLog.date == today).first()
    if not db_log:
        db_log = DailyLog(date=today)
        db.add(db_log)
        db.commit()
        db.refresh(db_log)

    # Accept any field from the dict
    allowed_fields = {'big_win', 'starting_nudge', 'goals_for_tomorrow', 'reflections', 'timer_end'}
    for key, value in log_update.items():
        if key in allowed_fields:
            setattr(db_log, key, value)

    db.commit()
    db.refresh(db_log)
    cache_service.invalidate_daily_log(today)
    await notify_dashboard()
    return db_log

@app.post("/tasks", response_model=TaskOut)
async def legacy_create_task(task: dict, db: Session = Depends(get_db)):
    """Legacy: Create a task"""
    new_task = Task(**task)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    cache_service.invalidate_projects()
    await notify_dashboard()
    return new_task

@app.patch("/tasks/{task_id}", response_model=TaskOut)
async def legacy_update_task(task_id: int, task_update: dict, db: Session = Depends(get_db)):
    """Legacy: Update a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for key, value in task_update.items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    cache_service.invalidate_projects()
    await notify_dashboard()
    return task

@app.delete("/tasks/{task_id}")
async def legacy_delete_task(task_id: int, db: Session = Depends(get_db)):
    """Legacy: Delete a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    cache_service.invalidate_projects()
    await notify_dashboard()
    return {"message": "Task deleted"}
