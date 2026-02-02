import sqlalchemy
from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:JrmR0pSy1U4kcJ6EzeBAj6YCpuTAUKmS2t7JyhJOBnMvNexQyBdFOM6AhTXQhFFM@5.161.88.222:39271/postgres")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Migrating daily_logs table for multi-stage briefings...")
    conn.execute(text("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS morning_briefing TEXT;"))
    conn.execute(text("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS midday_briefing TEXT;"))
    conn.execute(text("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS shutdown_briefing TEXT;"))
    conn.execute(text("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS nightly_reflection TEXT;"))
    conn.execute(text("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS goals_for_tomorrow JSONB DEFAULT '[]';"))
    conn.commit()
    print("Migration complete.")
