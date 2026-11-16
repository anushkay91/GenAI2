import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.services.db import init_db, is_sqlite
from app.services.gemini import HAS_GENAI
from app.routers import auth, agents, dashboard

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing operational database connection and schemas...")
    try:
        init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.critical(f"Database initialization failed: {e}")
    yield
    # Shutdown actions
    logger.info("Shutting down FastAPI Application...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Multi-Agent AI Decision Intelligence Platform for Indian Smart Cities.",
    version=settings.APP_VERSION,
    lifespan=lifespan
)


# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# CORS configuration with configurable origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True if settings.CORS_ORIGINS else False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include Routers
app.include_router(auth.router)
app.include_router(agents.router)
app.include_router(dashboard.router)


@app.get("/health", tags=["System Health"])
def health_check():
    """System health check and diagnostic endpoint."""
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "gcp_project": settings.GCP_PROJECT_ID,
        "database": {
            "type": "SQLite (Local Fallback)" if is_sqlite else "AlloyDB / PostgreSQL",
            "connected": True
        },
        "gemini_engine": {
            "model": settings.GEMINI_MODEL,
            "mode": "Active Cloud SDK" if HAS_GENAI else "Deterministic Simulator"
        }
    }


# Serve static files from the frontend build if present
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

@app.exception_handler(404)
async def not_found(request: Request, exc):
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return JSONResponse(status_code=404, content={"detail": "Resource Not Found"})
