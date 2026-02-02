import sqlalchemy
from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:JrmR0pSy1U4kcJ6EzeBAj6YCpuTAUKmS2t7JyhJOBnMvNexQyBdFOM6AhTXQhFFM@5.161.88.222:39271/postgres")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Migrating projects table for hierarchical sub-sectors...")

    # Add parent_id column (nullable for existing top-level projects)
    conn.execute(text("""
        ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES projects(id);
    """))

    conn.commit()
    print("Migration complete.")
    print("\nTo use sub-sectors, create projects with a parent_id:")
    print('  {"name": "Groceries", "parent_id": 1}  # Creates Groceries under project ID 1')
