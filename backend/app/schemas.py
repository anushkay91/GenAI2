from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Authentication Schemas ---
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: Optional[str] = Field("citizen", pattern="^(officer|analyst|citizen)$")
    department: Optional[str] = Field(None, max_length=100)

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    department: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class RoleSwitchRequest(BaseModel):
    role: str = Field(..., pattern="^(officer|analyst|citizen)$")


# --- Chat & RAG Schemas ---
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    image_base64: Optional[str] = None  # Base64 encoded image for Gemini Vision
    session_id: Optional[str] = Field("default-session", max_length=100)

class SourceCitation(BaseModel):
    filename: str
    score: float

class ChatResponse(BaseModel):
    response: str
    confidence_score: float
    sources: List[SourceCitation]
    agent_flow: List[str]
    data: Optional[Dict[str, Any]] = None


# --- Workflows & Dashboard Schemas ---
class WorkflowCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    category: str = Field(..., max_length=100)
    priority: str = Field("Medium", pattern="^(Low|Medium|High|Critical)$")

class WorkflowResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category: str
    status: str
    priority: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DashboardMetricsResponse(BaseModel):
    total_tickets: int
    resolved_tickets: int
    pending_tickets: int
    grievances_by_category: List[Dict[str, Any]]
    iot_sensors_status: List[Dict[str, Any]]
