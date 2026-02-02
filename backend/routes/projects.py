from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from models import Project
from schemas import ProjectOut, ProjectCreate, ProjectUpdate, PaginationParams, PaginatedResponse
from database import get_db, cache_service, notify_dashboard

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectOut])
def get_projects(
    pagination: PaginationParams = Depends(),
    db: Session = Depends(get_db)
):
    """Get all projects with optional pagination"""
    cached = cache_service.get_projects()
    if cached:
        # Apply pagination to cached data
        start = pagination.offset
        end = start + pagination.limit
        return cached[start:end]

    projects = db.query(Project).all()
    result = [ProjectOut.model_validate(p).model_dump() for p in projects]
    cache_service.set_projects(result)
    return result

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """Get a single project by ID"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.post("", response_model=ProjectOut)
async def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project"""
    db_project = db.query(Project).filter(Project.name == project.name).first()
    if db_project:
        raise HTTPException(status_code=409, detail="Project already exists")

    new_project = Project(**project.model_dump())
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    cache_service.invalidate_projects()
    await notify_dashboard()

    return new_project

@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db)
):
    """Update a project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)

    cache_service.invalidate_projects()
    await notify_dashboard()

    return project

@router.delete("/{project_id}")
async def delete_project(project_id: int, db: Session = Depends(get_db)):
    """Delete a project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()

    cache_service.invalidate_projects()
    await notify_dashboard()

    return {"message": "Project deleted"}
