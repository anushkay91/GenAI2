import pytest
import os
import sys
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
from app.services.db import init_db, SessionLocal, get_db
from app.routers.auth import create_access_token

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Initializes schemas and seeds demo accounts for testing session."""
    init_db()

@pytest.fixture
def db_session():
    """Provides a transactional database session for tests."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    return TestClient(app)

@pytest.fixture
def officer_token():
    return create_access_token({"sub": "Director_Karthik", "role": "officer"})

@pytest.fixture
def analyst_token():
    return create_access_token({"sub": "Analyst_Priya", "role": "analyst"})

@pytest.fixture
def citizen_token():
    return create_access_token({"sub": "Aarav_Sharma", "role": "citizen"})
