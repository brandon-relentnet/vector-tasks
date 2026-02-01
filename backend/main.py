import os
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime, Date, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship

# Database Connection
DATABASE_URL = "postgresql://postgres:JrmR0pSy1U4kcJ6EzeBAj6YCpuTAUKmS2t7JyhJOBnMvNexQyBdFOM6AhTXQhFFM@5.161.88.222:39271/postgres"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text)
    category = Column(String)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String, nullable=False)
    description = Column(Text)
    priority = Column(String, default="Med")
    status = Column(String, default="Todo")
    subtasks = Column(JSON, default=[])
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

class DailyLog(Base):
    __tablename__ = "daily_logs"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, default=datetime.utcnow().date())
    big_win = Column(Text)
    starting_nudge = Column(Text)
    reflections = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

# Schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "Med"
    status: str = "Todo"
    project_id: Optional[int] = None
    subtasks: List[dict] = []

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    subtasks: Optional[List[dict]] = None

class TaskOut(TaskBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: Optional[str]
    class Config:
        from_attributes = True

# App
app = FastAPI(title="Vector Tasks API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/projects", response_model=List[ProjectOut])
def get_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()

@app.get("/tasks", response_model=List[TaskOut])
def get_tasks(project_id: Optional[int] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Task)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if status:
        query = query.filter(Task.status == status)
    return query.all()

@app.post("/tasks", response_model=TaskOut)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    db_task = Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: int, task_update: TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted"}
