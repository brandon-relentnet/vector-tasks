"""
Project Management API

Endpoints for managing projects (sectors) in the Vector Tasks system.
Projects organize tasks into logical groups like 'Personal', 'Work', etc.
Supports hierarchical sub-sectors (e.g., Personal > Groceries).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from models import Project
from schemas import ProjectOut, ProjectCreate, ProjectUpdate, PaginationParams
from database import get_db, cache_service, notify_dashboard

router = APIRouter(prefix="/projects", tags=["Projects"])

def build_project_path(project: Project, db: Session) -> str:
    """Build full path like 'Personal > Groceries'"""
    if not project.parent_id:
        return project.name
    parent = db.query(Project).filter(Project.id == project.parent_id).first()
    if parent:
        return f"{build_project_path(parent, db)} > {project.name}"
    return project.name

def get_parent_name(project: Project, db: Session) -> Optional[str]:
    """Get parent name for display"""
    if not project.parent_id:
        return None
    parent = db.query(Project).filter(Project.id == project.parent_id).first()
    return parent.name if parent else None

@router.get(
    "",
    response_model=List[ProjectOut],
    summary="List all projects",
    description="Retrieve all projects with optional pagination. Results are cached for 5 minutes."
)
def get_projects(
    parent_id: Optional[int] = Query(None, description="Filter by parent ID (null = top-level)"),
    pagination: PaginationParams = Depends(),
    db: Session = Depends(get_db)
):
    """
    Get all projects with pagination support.

    - **parent_id**: Filter to only show projects under a specific parent
    - **limit**: Maximum number of results (1-100, default 50)
    - **offset**: Skip results for pagination
    """
    cached = cache_service.get_projects()
    if cached:
        if parent_id is not None:
            cached = [p for p in cached if p.get('parent_id') == parent_id]
        return cached[pagination.offset:pagination.offset + pagination.limit]

    query = db.query(Project)
    if parent_id is not None:
        query = query.filter(Project.parent_id == parent_id)
    projects = query.order_by(Project.name).all()

    result = []
    for p in projects:
        data = {
            'id': p.id,
            'name': p.name,
            'description': p.description,
            'category': p.category,
            'parent_id': p.parent_id,
            'parent_name': get_parent_name(p, db),
            'path': build_project_path(p, db),
        }
        result.append(data)

    cache_service.set_projects(result)
    return result

@router.get(
    "/tree",
    response_model=List[ProjectOut],
    summary="Get project hierarchy tree",
    description="Get all projects with their children for tree/breadcrumb display."
)
def get_project_tree(db: Session = Depends(get_db)):
    """
    Get all projects in a flat list with parent/child info for building UI trees.
    Each project includes its full path (e.g., 'Personal > Groceries').
    """
    projects = db.query(Project).order_by(Project.name).all()

    result = []
    for p in projects:
        data = {
            'id': p.id,
            'name': p.name,
            'description': p.description,
            'category': p.category,
            'parent_id': p.parent_id,
            'parent_name': get_parent_name(p, db),
            'path': build_project_path(p, db),
        }
        result.append(data)

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

    return {
        'id': project.id,
        'name': project.name,
        'description': project.description,
        'category': project.category,
        'parent_id': project.parent_id,
        'parent_name': get_parent_name(project, db),
        'path': build_project_path(project, db),
    }

@router.post(
    "",
    response_model=ProjectOut,
    status_code=201,
    summary="Create new project",
    description="Create a new project (sector) for organizing tasks. Can be a top-level sector or sub-sector."
)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """
    Create a new project.

    - **name**: Name for the project (required)
    - **description**: Optional description
    - **category**: Category label (defaults to 'General')
    - **parent_id**: Parent project ID (null/empty = top-level sector)

    Examples:
    - Top-level: {"name": "Personal"}
    - Sub-sector: {"name": "Groceries", "parent_id": 1} (under Personal)

    Returns 404 if parent_id is invalid.
    """
    if project.parent_id:
        parent = db.query(Project).filter(Project.id == project.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent project not found")

    new_project = Project(**project.model_dump())
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    result = {
        'id': new_project.id,
        'name': new_project.name,
        'description': new_project.description,
        'category': new_project.category,
        'parent_id': new_project.parent_id,
        'parent_name': get_parent_name(new_project, db),
        'path': build_project_path(new_project, db),
    }

    cache_service.invalidate_projects()
    await notify_dashboard()

    return result

@router.patch(
    "/{project_id}",
    response_model=ProjectOut,
    summary="Update project",
    description="Update an existing project's properties. Can also move a project to a different parent."
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
    - **parent_id**: Move to different parent (optional)

    Returns 404 if project or parent is not found.
    Prevents circular references (project can't be its own ancestor).
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check parent exists if provided
    if project_update.parent_id is not None:
        if project_update.parent_id == project_id:
            raise HTTPException(status_code=400, detail="Project cannot be its own parent")
        parent = db.query(Project).filter(Project.id == project_update.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent project not found")

    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)

    result = {
        'id': project.id,
        'name': project.name,
        'description': project.description,
        'category': project.category,
        'parent_id': project.parent_id,
        'parent_name': get_parent_name(project, db),
        'path': build_project_path(project, db),
    }

    cache_service.invalidate_projects()
    await notify_dashboard()

    return result

@router.delete(
    "/{project_id}",
    status_code=200,
    summary="Delete project",
    description="Permanently delete a project and all its sub-projects and tasks."
)
async def delete_project(project_id: int, db: Session = Depends(get_db)):
    """
    Delete a project.

    - **project_id**: The project to delete

    Warning: This will also delete all sub-projects and their tasks.
    Returns 404 if project is not found.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Delete all children first (cascade)
    children = db.query(Project).filter(Project.parent_id == project_id).all()
    for child in children:
        # Recursively delete grandchildren
        grandkids = db.query(Project).filter(Project.parent_id == child.id).all()
        for grandkid in grandkids:
            db.delete(grandkid)
        db.delete(child)

    db.delete(project)
    db.commit()

    cache_service.invalidate_projects()
    await notify_dashboard()

    return {"message": "Project and all sub-projects deleted"}
