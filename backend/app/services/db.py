import logging
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.models import Base

logger = logging.getLogger("app.services.db")
logging.basicConfig(level=logging.INFO)

# Primary database connection string for AlloyDB/PostgreSQL
DATABASE_URL = (
    f"postgresql://{settings.ALLOYDB_USER}:{settings.ALLOYDB_PASSWORD}@"
    f"{settings.ALLOYDB_HOST}:{settings.ALLOYDB_PORT}/{settings.ALLOYDB_DB}"
)

# Fallback mechanism for local development without running PostgreSQL
is_sqlite = False
try:
    engine = create_engine(
        DATABASE_URL, 
        pool_size=20, 
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800
    )
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info("Successfully connected to AlloyDB/PostgreSQL database.")
except Exception as e:
    # Resolve SQLite database path deterministically inside backend folder
    backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sqlite_file = settings.SQLITE_DB_PATH or os.path.join(backend_root, "decision_intel.db")
    
    logger.warning(
        f"Could not connect to PostgreSQL database ({e}). "
        f"Falling back to local SQLite at {sqlite_file}"
    )
    DATABASE_URL = f"sqlite:///{sqlite_file}"
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
    is_sqlite = True

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency injector for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_initial_users(db):
    """Seed initial administrative, analytical, and citizen demo accounts if not present."""
    from app.models.models import User
    from app.services.security import get_password_hash
    
    default_pw_hash = get_password_hash("Password123!")

    demo_users = [
        {
            "username": "Director_Karthik",
            "email": "director.karthik@district.gov.in",
            "hashed_password": default_pw_hash,
            "role": "officer",
            "department": "Municipal Command Center"
        },
        {
            "username": "Analyst_Priya",
            "email": "priya.analyst@district.gov.in",
            "hashed_password": default_pw_hash,
            "role": "analyst",
            "department": "Urban Analytics Division"
        },
        {
            "username": "Aarav_Sharma",
            "email": "aarav.sharma@citizen.in",
            "hashed_password": default_pw_hash,
            "role": "citizen",
            "department": "Ward 102 Resident"
        },
        {
            "username": "verify_officer",
            "email": "verify@district.gov.in",
            "hashed_password": default_pw_hash,
            "role": "officer",
            "department": "Quality Assurance"
        }
    ]

    for user_info in demo_users:
        existing = db.query(User).filter(User.username == user_info["username"]).first()
        if not existing:
            user = User(**user_info)
            db.add(user)
            logger.info(f"Seeded demo account: {user_info['username']} ({user_info['role']})")
    
    db.commit()


def init_db():
    """Initializes tables, pgvector extensions, and seed data on startup."""
    if not is_sqlite:
        try:
            with engine.begin() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            logger.info("pgvector extension checked/created successfully.")
        except Exception as e:
            logger.warning(f"Failed to create pgvector extension: {e}")
            
    Base.metadata.create_base = True
    Base.metadata.create_all(bind=engine)
    logger.info("Operational database tables initialized.")

    # Seed initial demo accounts
    db = SessionLocal()
    try:
        seed_initial_users(db)
    except Exception as e:
        logger.warning(f"User seeding encountered an issue: {e}")
    finally:
        db.close()
