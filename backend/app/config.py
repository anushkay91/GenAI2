import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Google Cloud Core Settings
    GCP_PROJECT_ID: str = os.getenv("GCP_PROJECT_ID", "carbon1-499909")
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
    
    # App Settings
    APP_NAME: str = "Smart City Decision Intelligence Platform"
    DEBUG: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
