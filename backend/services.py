import json
from datetime import date
from typing import Optional, Any
import redis

class CacheService:
    """Centralized cache management for the API"""

    def __init__(self, redis_client: redis.Redis):
        self.r = redis_client

    # Key patterns
    PROJECTS_KEY = "projects"
    DAILY_LOG_PREFIX = "log:"

    def get_projects(self) -> Optional[Any]:
        """Get cached projects list"""
        cached = self.r.get(self.PROJECTS_KEY)
        if cached:
            return json.loads(cached)
        return None

    def set_projects(self, projects: list, ttl: int = 300) -> None:
        """Cache projects list"""
        self.r.setex(self.PROJECTS_KEY, ttl, json.dumps(projects))

    def invalidate_projects(self) -> None:
        """Invalidate projects cache"""
        self.r.delete(self.PROJECTS_KEY)

    def get_daily_log_key(self, log_date: date) -> str:
        """Generate cache key for a specific daily log"""
        return f"{self.DAILY_LOG_PREFIX}{log_date.isoformat()}"

    def get_daily_log(self, log_date: date) -> Optional[Any]:
        """Get cached daily log"""
        key = self.get_daily_log_key(log_date)
        cached = self.r.get(key)
        if cached:
            return json.loads(cached)
        return None

    def set_daily_log(self, log_date: date, log_data: Any, ttl: int = 60) -> None:
        """Cache daily log"""
        key = self.get_daily_log_key(log_date)
        self.r.setex(key, ttl, json.dumps(log_data))

    def invalidate_daily_log(self, log_date: date) -> None:
        """Invalidate specific daily log cache"""
        key = self.get_daily_log_key(log_date)
        self.r.delete(key)

    def invalidate_all_caches(self) -> None:
        """Invalidate all caches (use sparingly)"""
        patterns = [
            self.PROJECTS_KEY,
            f"{self.DAILY_LOG_PREFIX}*"
        ]
        for pattern in patterns:
            keys = self.r.keys(pattern)
            if keys:
                self.r.delete(*keys)
