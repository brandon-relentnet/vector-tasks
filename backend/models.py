from datetime import datetime, UTC, date as py_date, timedelta
import pytz
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime, Date, JSON
from sqlalchemy.orm import sessionmaker, Session, declarative_base, relationship

# Timezone Configuration
LOCAL_TZ = pytz.timezone("America/Chicago")

def get_local_now():
    return datetime.now(UTC).astimezone(LOCAL_TZ)

def get_local_date():
    now = get_local_now()
    if now.hour < 8:
        return (now - timedelta(days=1)).date()
    return now.date()

Base = declarative_base()

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)  # Removed unique for sub-projects
    description = Column(Text)
    category = Column(String)
    parent_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    tasks = relationship("Task", back_populates="project")
    # Self-referential relationship for hierarchy
    parent = relationship("Project", remote_side=[id], backref="children")

class Briefing(Base):
    __tablename__ = "briefings"
    id = Column(Integer, primary_key=True, index=True)
    daily_log_id = Column(Integer, ForeignKey("daily_logs.id"))
    slot = Column(String)
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    daily_log = relationship("DailyLog", back_populates="briefings")

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
    date = Column(Date, unique=True, default=get_local_date)
    big_win = Column(Text)
    starting_nudge = Column(Text)
    morning_briefing = Column(Text, nullable=True)
    midday_briefing = Column(Text, nullable=True)
    shutdown_briefing = Column(Text, nullable=True)
    nightly_reflection = Column(Text, nullable=True)
    goals_for_tomorrow = Column(JSON, default=[])
    timer_end = Column(DateTime(timezone=True), nullable=True)
    reflections = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    briefings = relationship("Briefing", back_populates="daily_log", order_by="desc(Briefing.created_at)")
