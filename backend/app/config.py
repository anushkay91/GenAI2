import os
import logging
from typing import List, Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict  # pyrefly: ignore[missing-import] # type: ignore

logger = logging.getLogger("app.config")

class Settings(BaseSettings):
    # App & Environment Settings
    APP_NAME: str = "Smart City Decision Intelligence Platform"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")  # development, staging, production
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "t")
    
    # CORS Security
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    # File Upload Security Limits
    MAX_UPLOAD_SIZE_MB: int = 10
    MAX_CHAT_MESSAGE_LENGTH: int = 5000
    LOCAL_UPLOAD_DIR: str = os.getenv(
        "LOCAL_UPLOAD_DIR", 
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    )
    
    # Google Cloud Core Settings
    GCP_PROJECT_ID: str = os.getenv("GCP_PROJECT_ID", "smartcity-515403")
    GCP_LOCATION: str = os.getenv("GCP_LOCATION", "asia-south1")  # India Region
    
    # Gemini Models
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-004")
    
    # AlloyDB Settings
    ALLOYDB_HOST: str = os.getenv("ALLOYDB_HOST", "localhost")
    ALLOYDB_PORT: int = int(os.getenv("ALLOYDB_PORT", "5432"))
    ALLOYDB_USER: str = os.getenv("ALLOYDB_USER", "postgres")
    ALLOYDB_PASSWORD: str = os.getenv("ALLOYDB_PASSWORD", "postgres")
    ALLOYDB_DB: str = os.getenv("ALLOYDB_DB", "decision_intel")
    SQLITE_DB_PATH: Optional[str] = os.getenv("SQLITE_DB_PATH", None)
    
    # BigQuery Settings
    BQ_DATASET: str = os.getenv("BQ_DATASET", "smart_city_metrics")
    
    # Cloud Storage Settings
    GCS_BUCKET_NAME: str = os.getenv("GCS_BUCKET_NAME", "smart-city-documents-bucket")
    
    # Firestore / Sessions Settings
    FIRESTORE_COLLECTION: str = os.getenv("FIRESTORE_COLLECTION", "user_sessions")
    
    # Authentication (JWT)
    SECRET_KEY: str = os.getenv("SECRET_KEY", "SUPER_SECRET_SMART_CITY_DECISION_PLATFORM_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    @model_validator(mode="after")
    def validate_security_settings(self):
        insecure_default = "SUPER_SECRET_SMART_CITY_DECISION_PLATFORM_KEY"
        if self.ENVIRONMENT == "production":
            if self.SECRET_KEY == insecure_default:
                raise ValueError(
                    "Production deployment rejected: SECRET_KEY must be overridden with a secure, random value in production."
                )
            if len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "Production deployment rejected: SECRET_KEY must be at least 32 characters long."
                )
        elif self.SECRET_KEY == insecure_default:
            logger.warning(
                "Running with default development SECRET_KEY. Ensure a strong SECRET_KEY is set in production."
            )
        return self

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        extra="ignore"
    )

settings = Settings()
