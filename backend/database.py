import os
from dotenv import load_dotenv
load_dotenv()

from datetime import datetime, UTC
import socketio
import redis
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import Base
from services import CacheService

# Database Connection
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

REDIS_URL = os.getenv("REDIS_URL")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Redis Client
redis_client = redis.from_url(REDIS_URL, decode_responses=True)
cache_service = CacheService(redis_client)

# Socket.IO setup - allow CORS from frontend
import os

# Parse CORS_ORIGINS - handle duplicates and whitespace
cors_env = os.getenv("CORS_ORIGINS", "http://localhost:3000")
origins = [o.strip() for o in cors_env.split(",") if o.strip()]
origins = list(dict.fromkeys(origins))  # Remove duplicates
print(f"[Socket] CORS origins: {origins}")

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=origins,
    cors_credentials=True,
    logger=True,
    engineio_logger=True,
)
sio_app = socketio.ASGIApp(sio)

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

async def notify_dashboard():
    """Broadcast update event to all connected clients"""
    print(f"[Socket] Broadcasting update to all clients")
    await sio.emit('update', {'timestamp': datetime.now(UTC).isoformat()})

def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create tables on startup
Base.metadata.create_all(bind=engine)
