"""
Project Management API

Endpoints for managing projects (sectors) in the Vector Tasks system.
Projects organize tasks into logical groups like 'Personal', 'Work', etc.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from models import Project
from schemas import ProjectOut, ProjectCreate, ProjectUpdate, PaginationParams
from database import get_db, cache_service, notify_dashboard

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])

@router.get(
    "",
    response_model=List[ProjectOut],
    summary="List all projects",
    description="Retrieve all projects with optional pagination. Results are cached for 5 minutes."
)
def get_projects(
    pagination: PaginationParams = Depends(),
    db: Session = Depends(get_db)
):
    """
    Get all projects with pagination support.

    - **limit**: Maximum number of results to return (1-100, default 50)
    - **offset**: Number of results to skip for pagination
    """
    cached = cache_service.get_projects()
    if cached:
        start = pagination.offset
        end = start + pagination.limit
        return cached[start:end]

    projects = db.query(Project).all()
    result = [ProjectOut.model_validate(p).model_dump() for p in projects]
    cache_service.set_projects(result)
    return result

@router.get(
    "/{project_id}",
    response_model=ProjectOut,
    summary="Get project by ID",
    description="Retrieve a single project by its unique identifier."
)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """
    Get a specific project.

    - **project_id**: The unique identifier of the project

    Returns 404 if project is not found.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.post(
    "",
    response_model=ProjectOut,
    status_code=201,
    summary="Create new project",
    description="Create a new project (sector) for organizing tasks."
)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """
    Create a new project.

    - **name**: Unique name for the project (required)
    - **description**: Optional description of the project
    - **category**: Category label (defaults to 'General')

    Returns 409 if a project with the same name already exists.
    """
    db_project = db.query(Project).filter(Project.name == project.name).first()
    if db_project:
        raise HTTPException(status_code=409, detail="Project already exists")

    new_project = Project(**project.model_dump())
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    cache_service.invalidate_projects()
    notify_dashboard()

    return new_project

@router.patch(
    "/{project_id}",
    response_model=ProjectOut,
    summary="Update project",
    description="Update an existing project's properties. Only provided fields are updated."
)
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db)
):
    """
    Update project details.

    - **project_id**: The project to update
    - **name**: New name (optional)
    - **description**: New description (optional)
    - **category**: New category (optional)

    Returns 404 if project is not found.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)

    cache_service.invalidate_projects()
    notify_dashboard()

    return project

@router.delete(
    "/{project_id}",
    status_code=200,
    summary="Delete project",
    description="Permanently delete a project and all its associated tasks."
)
async def delete_project(project_id: int, db: Session = Depends(get_db)):
    """
    Delete a project.

    - **project_id**: The project to delete

    Returns 404 if project is not found.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()

    cache_service.invalidate_projects()
    notify_dashboard()

    return {"message": "Project deleted"}
