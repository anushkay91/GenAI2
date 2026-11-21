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


# --- Agent Structured Output Schemas ---
class SectorPredictionResponse(BaseModel):
    sector: str = Field(..., description="Municipal sector name, e.g., traffic, water, waste, grievances")
    ward_id: int = Field(..., ge=1, le=999, description="Ward numerical identifier")
    trend_direction: str = Field(..., description="Direction of trend: Increasing, Decreasing, or Stable")
    predicted_load_percentage: float = Field(..., ge=0.0, le=100.0, description="Projected sector load percentage")
    anomaly_risk_score: float = Field(..., ge=0.0, le=1.0, description="Risk probability score between 0.0 and 1.0")
    forecast_summary: str = Field(..., min_length=1, description="Concise textual summary of forecast")
    contributing_factors: List[str] = Field(default_factory=list, description="Key drivers of the predicted trend")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Statistical confidence score between 0.0 and 1.0")


class ActionRecommendationResponse(BaseModel):
    immediate_actions: List[str] = Field(..., min_length=1, description="Immediate 1-2 hour tactical actions")
    remedial_actions: List[str] = Field(default_factory=list, description="24-hour remedial actions")
    long_term_strategies: List[str] = Field(default_factory=list, description="Long-term structural reforms")
    cost_benefit_assessment: str = Field(..., min_length=1, description="Brief financial or operational assessment")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
