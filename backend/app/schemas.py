from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Authentication ---
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Optional[str] = "citizen"  # "officer", "analyst", "citizen"
    department: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    department: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


# --- Chat & RAG ---
class ChatRequest(BaseModel):
    message: str
    image_base64: Optional[str] = None  # Base64 encoded image for Gemini Vision
    session_id: Optional[str] = "default-session"

class SourceCitation(BaseModel):
    filename: str
    score: float

class ChatResponse(BaseModel):
    response: str
    confidence_score: float
    sources: List[SourceCitation]
    agent_flow: List[str]
    data: Optional[Dict[str, Any]] = None


# --- Workflows & Dashboard ---
class WorkflowCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    priority: str = "Medium"

class WorkflowResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category: str
    status: str
    priority: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DashboardMetricsResponse(BaseModel):
    total_tickets: int
    resolved_tickets: int
    pending_tickets: int
    grievances_by_category: List[Dict[str, Any]]
    iot_sensors_status: List[Dict[str, Any]]
