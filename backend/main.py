import os
from datetime import datetime, UTC, date as py_date
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime, Date, JSON
from sqlalchemy.orm import sessionmaker, Session, declarative_base, relationship
import socketio

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
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    
    tasks = relationship("Task", back_populates="project")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String, nullable=False)
    description = Column(Text)
    priority = Column(String, default="Med")
    status = Column(String, default="Todo")
    subtasks = Column(JSON, default=[])
    nudge_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    project = relationship("Project", back_populates="tasks")

class DailyLog(Base):
    __tablename__ = "daily_logs"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, default=lambda: datetime.now(UTC).date())
    big_win = Column(Text)
    starting_nudge = Column(Text)
    morning_briefing = Column(Text)
    nightly_reflection = Column(Text)
    goals_for_tomorrow = Column(JSON, default=[])
    reflections = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

# Schemas
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
        # Overriding to inject project_name from relationship
        instance = super().from_orm(obj)
        if obj.project:
            instance.project_name = obj.project.name
        return instance

class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: Optional[str]
    model_config = ConfigDict(from_attributes=True)

class DailyLogOut(BaseModel):
    id: int
    date: py_date
    big_win: Optional[str] = None
    starting_nudge: Optional[str] = None
    morning_briefing: Optional[str] = None
    nightly_reflection: Optional[str] = None
    goals_for_tomorrow: List[str] = []
    reflections: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# Socket.IO setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins=[])
sio_app = socketio.ASGIApp(sio)

# App
app = FastAPI(title="Vector Tasks API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO to FastAPI
app.mount("/socket.io", sio_app)

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

# Helper to notify dashboard of changes
async def notify_dashboard():
    await sio.emit('update', {'timestamp': datetime.now(UTC).isoformat()})

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
    
    tasks = query.order_by(Task.created_at.desc()).all()
    return [TaskOut.from_orm(t) for t in tasks]

@app.get("/tasks/{task_id}", response_model=TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskOut.from_orm(db_task)

@app.post("/tasks", response_model=TaskOut)
async def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    db_task = Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    await notify_dashboard()
    return TaskOut.from_orm(db_task)

@app.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task(task_id: int, task_update: TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
    
    db.commit()
    db.refresh(db_task)
    await notify_dashboard()
    return TaskOut.from_orm(db_task)

@app.delete("/tasks/{task_id}")
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(db_task)
    db.commit()
    await notify_dashboard()
    return {"message": "Task deleted"}

@app.get("/daily-log", response_model=Optional[DailyLogOut])
def get_daily_log(db: Session = Depends(get_db)):
    today = datetime.now(UTC).date()
    return db.query(DailyLog).filter(DailyLog.date == today).first()
