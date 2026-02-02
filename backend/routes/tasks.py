from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.orm import Session, joinedload

from models import Task
from schemas import TaskOut, TaskCreate, TaskUpdate, PaginationParams
from database import get_db, cache_service, notify_dashboard

router = APIRouter(prefix="/api/v1/tasks", tags=["Tasks"])

@router.get("", response_model=List[TaskOut])
def get_tasks(
    request: Request,
    project_id: Optional[int] = Query(None, description="Filter by project"),
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    pagination: PaginationParams = Depends(),
    db: Session = Depends(get_db)
):
    """Get tasks with optional filters and pagination"""
    query = db.query(Task)

    if project_id:
        query = query.filter(Task.project_id == project_id)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)

    # Eager load project to prevent N+1 queries
    query = query.options(joinedload(Task.project))

    tasks = query.order_by(Task.created_at.desc()).offset(pagination.offset).limit(pagination.limit).all()

    return tasks

@router.get("/active", response_model=List[TaskOut])
def get_active_tasks(db: Session = Depends(get_db)):
    """Get all tasks that are not completed"""
    tasks = db.query(Task).filter(Task.status != "Done").options(joinedload(Task.project)).all()
    return tasks

@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    """Get a single task by ID"""
    task = db.query(Task).options(joinedload(Task.project)).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("", response_model=TaskOut)
async def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task"""
    new_task = Task(**task.model_dump())
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    cache_service.invalidate_projects()
    await notify_dashboard()

    return new_task

@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    db: Session = Depends(get_db)
):
    """Update a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)

    cache_service.invalidate_projects()
    await notify_dashboard()

    return task

@router.delete("/{task_id}")
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()

    cache_service.invalidate_projects()
    await notify_dashboard()

    return {"message": "Task deleted"}
