import sqlalchemy
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:JrmR0pSy1U4kcJ6EzeBAj6YCpuTAUKmS2t7JyhJOBnMvNexQyBdFOM6AhTXQhFFM@5.161.88.222:39271/postgres"
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Migrating daily_logs table for Mission Timer...")
    conn.execute(text("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS timer_end TIMESTAMPTZ;"))
    conn.commit()
    print("Migration complete.")
