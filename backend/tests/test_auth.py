import pytest
from app.services.security import get_password_hash, verify_password
from app.routers.auth import create_access_token, RoleChecker
from app.models.models import User
from fastapi import HTTPException

def test_password_hashing():
    pw = "SuperSecurePassword123!"
    hashed = get_password_hash(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_generation():
    token = create_access_token({"sub": "Director_Karthik", "role": "officer"})
    assert isinstance(token, str)
    assert len(token) > 20

def test_role_checker_enforcement():
    checker = RoleChecker(["officer", "analyst"])
    
    officer_user = User(username="officer_user", role="officer")
    analyst_user = User(username="analyst_user", role="analyst")
    citizen_user = User(username="citizen_user", role="citizen")

    assert checker(officer_user) == officer_user
    assert checker(analyst_user) == analyst_user

    with pytest.raises(HTTPException) as exc_info:
        checker(citizen_user)
    assert exc_info.value.status_code == 403
