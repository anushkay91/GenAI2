import logging
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.models import Base

logger = logging.getLogger("app.services.db")
logging.basicConfig(level=logging.INFO)

# Check database dialetic config
DATABASE_URL = f"postgresql://{settings.ALLOYDB_USER}:{settings.ALLOYDB_PASSWORD}@{settings.ALLOYDB_HOST}:{settings.ALLOYDB_PORT}/{settings.ALLOYDB_DB}"

# Fallback mechanism for easy local setup without running PostgreSQL
is_sqlite = False
try:
    # Try creating PostgreSQL engine
    engine = create_engine(
        DATABASE_URL, 
        pool_size=20, 
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800
    )
    # Test connection
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info("Successfully connected to AlloyDB/PostgreSQL database.")
except Exception as e:
    logger.warning(f"Could not connect to PostgreSQL database ({e}). Falling back to local SQLite.")
    DATABASE_URL = "sqlite:///./decision_intel.db"
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
    is_sqlite = True

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency injector for database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes tables and dependencies on start up"""
    # Create extension vector if postgres
    if not is_sqlite:
        try:
            with engine.begin() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            logger.info("pgvector extension checked/created successfully.")
        except Exception as e:
            logger.warning(f"Failed to create pgvector extension (might lack permissions): {e}")
            
    # Create all tables
    Base.metadata.create_base = True
    Base.metadata.create_all(bind=engine)
    logger.info("Operational database tables initialized.")
