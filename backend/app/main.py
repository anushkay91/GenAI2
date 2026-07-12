import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.services.db import init_db
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
    # Shutdown actions (if any)
    logger.info("Shutting down FastAPI Application...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Multi-Agent AI Decision Intelligence Platform for Indian Smart Cities.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for Frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to actual frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(agents.router)
app.include_router(dashboard.router)


@app.get("/health", tags=["System Health"])
def health_check():
    """Simple status check for GCP deployment run check."""
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "gcp_project": settings.GCP_PROJECT_ID,
        "gemini_model": settings.GEMINI_MODEL
    }


# Serve static files from the frontend build
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

@app.exception_handler(404)
async def not_found(request, exc):
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"detail": "Not Found"}

