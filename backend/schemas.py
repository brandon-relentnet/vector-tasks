from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

# Briefing Schemas
class BriefingBase(BaseModel):
    slot: str
    content: str

class BriefingCreate(BriefingBase):
    pass

class BriefingOut(BriefingBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Task Schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "Med"
    status: str = "Todo"
    project_id: Optional[int] = None
    subtasks: List[dict] = []
    nudge_count: int = 0

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    project_id: Optional[int] = None
    subtasks: Optional[List[dict]] = None
    nudge_count: Optional[int] = None

class TaskOut(TaskBase):
    id: int
    created_at: datetime
    updated_at: datetime
    project_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm(cls, obj):
        instance = super().from_orm(obj)
        if obj.project:
            instance.project_name = obj.project.name
        return instance

# Project Schemas
class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: Optional[str]
    parent_id: Optional[int] = None
    parent_name: Optional[str] = None
    path: str = ""  # Full path like "Personal > Groceries"
    model_config = ConfigDict(from_attributes=True)

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = "General"
    parent_id: Optional[int] = None  # None = top-level sector

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    parent_id: Optional[int] = None  # Move to different parent

# For frontend breadcrumb display
class ProjectTreeItem(BaseModel):
    id: int
    name: str
    parent_id: Optional[int]
    children: List["ProjectTreeItem"] = []
    model_config = ConfigDict(from_attributes=True)

ProjectTreeItem.model_rebuild()

# Daily Log Schemas
class DailyLogOut(BaseModel):
    id: int
    date: date
    big_win: Optional[str] = None
    starting_nudge: Optional[str] = None
    briefings: List[BriefingOut] = []
    morning_briefing: Optional[str] = None
    midday_briefing: Optional[str] = None
    shutdown_briefing: Optional[str] = None
    nightly_reflection: Optional[str] = None
    goals_for_tomorrow: List[str] = []
    timer_end: Optional[datetime] = None
    reflections: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class DailyLogUpdate(BaseModel):
    """Schema for updating daily log - excludes internal fields"""
    big_win: Optional[str] = None
    starting_nudge: Optional[str] = None
    goals_for_tomorrow: Optional[List[str]] = None
    reflections: Optional[str] = None
    timer_end: Optional[datetime] = None

class DailyLogHistoryItem(BaseModel):
    """Simplified schema for history list"""
    id: int
    date: date
    big_win: Optional[str] = None
    morning_briefing: Optional[str] = None
    midday_briefing: Optional[str] = None
    shutdown_briefing: Optional[str] = None
    nightly_reflection: Optional[str] = None
    goals_for_tomorrow: List[str] = []
    reflections: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# Pagination Schemas
class PaginationParams(BaseModel):
    """Common pagination parameters"""
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)

class PaginatedResponse(BaseModel):
    """Generic paginated response wrapper"""
    data: List
    pagination: dict

# API Response Wrappers
class SuccessResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    code: Optional[str] = None
