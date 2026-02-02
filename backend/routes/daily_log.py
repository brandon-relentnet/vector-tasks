from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload

from models import DailyLog, Briefing, get_local_date
from schemas import (
    DailyLogOut, BriefingOut, BriefingCreate, DailyLogUpdate,
    DailyLogHistoryItem, PaginationParams
)
from database import get_db, cache_service, notify_dashboard

router = APIRouter(prefix="/api/v1/daily-log", tags=["Daily Log"])

@router.get("", response_model=Optional[DailyLogOut])
def get_daily_log(db: Session = Depends(get_db)):
    """Get today's daily log"""
    today_date = get_local_date()
    today_str = today_date.isoformat()

    cached = cache_service.get_daily_log(today_date)
    if cached:
        return cached

    log = db.query(DailyLog).filter(DailyLog.date == today_date).first()
    if log:
        log_data = DailyLogOut.model_validate(log).model_dump(mode='json')
        cache_service.set_daily_log(today_date, log_data)
    return log

@router.post("/briefing", response_model=BriefingOut)
async def add_briefing(briefing: BriefingCreate, db: Session = Depends(get_db)):
    """Add a briefing to today's log"""
    today = get_local_date()
    log = db.query(DailyLog).filter(DailyLog.date == today).first()
    if not log:
        log = DailyLog(date=today)
        db.add(log)
        db.commit()
        db.refresh(log)

    new_briefing = Briefing(daily_log_id=log.id, **briefing.model_dump())
    db.add(new_briefing)

    # Backward compatibility: update deprecated columns
    slot_map = {
        "Morning": "morning_briefing",
        "Midday": "midday_briefing",
        "Shutdown": "shutdown_briefing",
        "Night": "nightly_reflection"
    }
    if briefing.slot in slot_map:
        setattr(log, slot_map[briefing.slot], briefing.content)

    db.commit()
    db.refresh(new_briefing)

    cache_service.invalidate_daily_log(today)
    await notify_dashboard()

    return new_briefing

@router.get("/history", response_model=List[DailyLogHistoryItem])
def get_daily_log_history(
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    has_morning: Optional[bool] = Query(None),
    has_night: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Get historical daily logs with filters"""
    query = db.query(DailyLog)

    if has_morning:
        query = query.filter(DailyLog.morning_briefing.isnot(None))
    if has_night:
        query = query.filter(DailyLog.nightly_reflection.isnot(None))

    logs = query.order_by(DailyLog.date.desc()).offset(offset).limit(limit).all()
    return logs

@router.post("/update", response_model=DailyLogOut)
async def update_daily_log(
    log_update: DailyLogUpdate,
    db: Session = Depends(get_db)
):
    """Update today's daily log"""
    today = get_local_date()
    db_log = db.query(DailyLog).filter(DailyLog.date == today).first()
    if not db_log:
        db_log = DailyLog(date=today)
        db.add(db_log)
        db.commit()
        db.refresh(db_log)

    update_data = log_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_log, key, value)

    db.commit()
    db.refresh(db_log)

    cache_service.invalidate_daily_log(today)
    await notify_dashboard()

    return db_log

@router.post("/mark-goal", response_model=DailyLogOut)
async def mark_goal_completed(
    goal: str,
    db: Session = Depends(get_db)
):
    """Mark a goal as completed in today's reflections"""
    today = get_local_date()
    db_log = db.query(DailyLog).filter(DailyLog.date == today).first()
    if not db_log:
        db_log = DailyLog(date=today, reflections="")
        db.add(db_log)
        db.commit()
        db.refresh(db_log)

    # Get current reflections
    current_reflections = db_log.reflections or ""
    completed_goals = [g for g in current_reflections.split('|') if g]

    if goal not in completed_goals:
        completed_goals.append(goal)
        db_log.reflections = '|'.join(completed_goals)

    db.commit()
    db.refresh(db_log)

    cache_service.invalidate_daily_log(today)
    await notify_dashboard()

    return db_log
