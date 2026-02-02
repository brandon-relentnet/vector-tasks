"""
Task Management API

Endpoints for managing tasks (quests) in the Vector Tasks system.
Tasks are organized within projects and have status, priority, and tracking.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from models import Task
from schemas import TaskOut, TaskCreate, TaskUpdate, PaginationParams
from database import get_db, cache_service, notify_dashboard

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get(
    "",
    response_model=List[TaskOut],
    summary="List all tasks",
    description="Retrieve tasks with optional filters for project, status, and priority. Supports pagination."
)
def get_tasks(
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    status: Optional[str] = Query(None, description="Filter by status (Todo, Working, Done)"),
    priority: Optional[str] = Query(None, description="Filter by priority (Low, Med, High)"),
    pagination: PaginationParams = Depends(),
    db: Session = Depends(get_db)
):
    """
    Get tasks with filtering and pagination.

    - **project_id**: Only return tasks from this project
    - **status**: Filter by task status (Todo, Working, Done)
    - **priority**: Filter by priority level (Low, Med, High)
    - **limit**: Maximum results (1-100, default 50)
    - **offset**: Skip results for pagination
    """
    query = db.query(Task)

    if project_id:
        query = query.filter(Task.project_id == project_id)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)

    tasks = query.order_by(Task.created_at.desc()).offset(pagination.offset).limit(pagination.limit).all()

    return tasks

@router.get(
    "/active",
    response_model=List[TaskOut],
    summary="List active tasks",
    description="Get all tasks that are not yet completed (status != Done)."
)
def get_active_tasks(db: Session = Depends(get_db)):
    """
    Get all incomplete tasks.

    Returns tasks with status of 'Todo' or 'Working', ordered by creation date.
    """
    tasks = db.query(Task).filter(Task.status != "Done").order_by(Task.created_at.desc()).all()
    return tasks

@router.get(
    "/{task_id}",
    response_model=TaskOut,
    summary="Get task by ID",
    description="Retrieve a single task by its unique identifier."
)
def get_task(task_id: int, db: Session = Depends(get_db)):
    """
    Get a specific task.

    - **task_id**: The unique identifier of the task

    Returns 404 if task is not found.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post(
    "",
    response_model=TaskOut,
    status_code=201,
    summary="Create new task",
    description="Create a new task (quest) within a project."
)
async def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """
    Create a new task.

    - **title**: Task title (required)
    - **description**: Optional detailed description
    - **priority**: Priority level (Low, Med, High, default Med)
    - **status**: Initial status (default Todo)
    - **project_id**: Project to assign task to (required)
    - **subtasks**: Optional list of subtask objects
    """
    new_task = Task(**task.model_dump())
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    cache_service.invalidate_projects()
    notify_dashboard()

    return new_task

@router.patch(
    "/{task_id}",
    response_model=TaskOut,
    summary="Update task",
    description="Update an existing task's properties. Only provided fields are updated."
)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    db: Session = Depends(get_db)
):
    """
    Update task details.

    - **task_id**: The task to update
    - **title**: New title (optional)
    - **description**: New description (optional)
    - **priority**: New priority level (optional)
    - **status**: New status (optional)
    - **project_id**: Move to different project (optional)
    - **subasks**: Update subtasks (optional)

    Returns 404 if task is not found.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)

    cache_service.invalidate_projects()
    notify_dashboard()

    return task

@router.delete(
    "/{task_id}",
    status_code=200,
    summary="Delete task",
    description="Permanently delete a task."
)
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    """
    Delete a task.

    - **task_id**: The task to delete

    Returns 404 if task is not found.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()

    cache_service.invalidate_projects()
    notify_dashboard()

    return {"message": "Task deleted"}
