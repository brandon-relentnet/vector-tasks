"""
Daily Log API

Endpoints for managing daily logs (briefings) in the Vector Tasks system.
Daily logs track XP, reflections, goals, and briefings for each operational day.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload

from models import DailyLog, Briefing, get_local_date
from schemas import (
    DailyLogOut, BriefingOut, BriefingCreate, DailyLogUpdate,
    DailyLogHistoryItem
)
from database import get_db, cache_service, notify_dashboard

router = APIRouter(prefix="/daily-log", tags=["Daily Log"])

@router.get(
    "",
    response_model=Optional[DailyLogOut],
    summary="Get today's daily log",
    description="Retrieve today's daily log with briefings, XP, goals, and reflections."
)
def get_daily_log(db: Session = Depends(get_db)):
    """
    Get today's daily log.

    The daily log contains:
    - Big win and starting nudge from the morning briefing
    - Goals for tomorrow
    - Briefings (Morning, Midday, Shutdown, Night)
    - Reflections on completed goals

    Results are cached for 60 seconds.
    """
    today_date = get_local_date()
    today_str = today_date.isoformat()

    cached = cache_service.get_daily_log(today_date)
    if cached:
        return cached

    # Eager load briefings to avoid N+1 query
    log = db.query(DailyLog).options(joinedload(DailyLog.briefings)).filter(DailyLog.date == today_date).first()
    if log:
        log_data = DailyLogOut.model_validate(log).model_dump(mode='json')
        cache_service.set_daily_log(today_date, log_data)
    return log

@router.post(
    "/briefing",
    response_model=BriefingOut,
    summary="Add briefing",
    description="Add a new briefing (Morning, Midday, Shutdown, or Night) to today's log."
)
async def add_briefing(briefing: BriefingCreate, db: Session = Depends(get_db)):
    """
    Add a briefing to today's log.

    - **slot**: Briefing slot (Morning, Midday, Shutdown, Night)
    - **content**: Briefing content/text

    Creates a new daily log if one doesn't exist for today.
    Also updates the deprecated column for backward compatibility.
    """
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

@router.get(
    "/history",
    response_model=List[DailyLogHistoryItem],
    summary="Get daily log history",
    description="Retrieve historical daily logs with optional filtering."
)
def get_daily_log_history(
    limit: int = Query(default=10, ge=1, le=50, description="Maximum results"),
    offset: int = Query(default=0, ge=0, description="Skip results"),
    has_morning: Optional[bool] = Query(None, description="Filter to logs with morning briefing"),
    has_night: Optional[bool] = Query(None, description="Filter to logs with nightly reflection"),
    db: Session = Depends(get_db)
):
    """
    Get historical daily logs.

    - **limit**: Maximum number of logs to return (1-50, default 10)
    - **offset**: Skip logs for pagination
    - **has_morning**: Only return logs with morning briefing
    - **has_night**: Only return logs with nightly reflection

    Results are ordered by date (newest first).
    """
    query = db.query(DailyLog)

    if has_morning:
        query = query.filter(DailyLog.morning_briefing.isnot(None))
    if has_night:
        query = query.filter(DailyLog.nightly_reflection.isnot(None))

    logs = query.order_by(DailyLog.date.desc()).offset(offset).limit(limit).all()
    return logs

@router.post(
    "/update",
    response_model=Optional[DailyLogOut],
    summary="Update daily log",
    description="Update today's daily log with new reflections, goals, or other fields."
)
async def update_daily_log(
    log_update: DailyLogUpdate,
    db: Session = Depends(get_db)
):
    """
    Update today's daily log.

    - **big_win**: Big win from the day
    - **starting_nudge**: Starting nudge for tomorrow
    - **goals_for_tomorrow**: List of goals for tomorrow
    - **reflections**: Completed goals (pipe-separated)
    - **timer_end**: Optional timer end time

    Creates a new daily log if one doesn't exist for today.
    """
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

@router.post(
    "/mark-goal",
    response_model=Optional[DailyLogOut],
    summary="Mark goal as completed",
    description="Mark a goal as completed in today's reflections."
)
async def mark_goal_completed(
    goal: str = Query(..., description="The goal to mark as completed"),
    db: Session = Depends(get_db)
):
    """
    Mark a goal as completed.

    - **goal**: The goal text to mark as completed

    The goal is added to the reflections pipe-separated list.
    Creates a daily log if one doesn't exist.
    """
    today = get_local_date()
    db_log = db.query(DailyLog).filter(DailyLog.date == today).first()
    if not db_log:
        db_log = DailyLog(date=today, reflections="")
        db.add(db_log)
        db.commit()
        db.refresh(db_log)

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

@router.delete(
    "/briefing/{briefing_id}",
    status_code=200,
    summary="Delete briefing",
    description="Delete a briefing by ID."
)
async def delete_briefing(briefing_id: int, db: Session = Depends(get_db)):
    """
    Delete a briefing.

    - **briefing_id**: The ID of the briefing to delete

    Returns 404 if briefing is not found.
    Also clears the deprecated column for that slot type.
    """
    briefing = db.query(Briefing).filter(Briefing.id == briefing_id).first()
    if not briefing:
        raise HTTPException(status_code=404, detail="Briefing not found")

    # Store slot for clearing deprecated column
    slot = briefing.slot
    daily_log_id = briefing.daily_log_id

    db.delete(briefing)
    db.commit()

    # Clear deprecated column for backward compatibility
    if slot and daily_log_id:
        slot_map = {
            "Morning": "morning_briefing",
            "Midday": "midday_briefing",
            "Shutdown": "shutdown_briefing",
            "Night": "nightly_reflection"
        }
        if slot in slot_map:
            daily_log = db.query(DailyLog).filter(DailyLog.id == daily_log_id).first()
            if daily_log:
                setattr(daily_log, slot_map[slot], None)
                db.commit()

    cache_service.invalidate_daily_log(get_local_date())
    await notify_dashboard()

    return {"message": "Briefing deleted"}

@router.delete(
    "/{log_id}",
    status_code=200,
    summary="Delete daily log",
    description="Delete a daily log and all associated briefings by ID."
)
async def delete_daily_log(log_id: int, db: Session = Depends(get_db)):
    """
    Delete a daily log.

    - **log_id**: The ID of the daily log to delete

    This will also delete all associated briefings.
    Returns 404 if daily log is not found.
    """
    db_log = db.query(DailyLog).filter(DailyLog.id == log_id).first()
    if not db_log:
        raise HTTPException(status_code=404, detail="Daily log not found")

    # Delete associated briefings first
    db.query(Briefing).filter(Briefing.daily_log_id == log_id).delete()

    # Delete the daily log
    db.delete(db_log)
    db.commit()

    cache_service.invalidate_daily_log(get_local_date())
    await notify_dashboard()

    return {"message": "Daily log deleted"}
