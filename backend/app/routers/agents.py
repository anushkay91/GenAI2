import base64
import logging
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.services.db import get_db
from app.routers.auth import get_current_user, get_optional_user, RoleChecker
from app.models.models import User, RagDocument, Workflow
from app.schemas import ChatRequest, ChatResponse, WorkflowResponse, WorkflowCreate
from app.agents.ceo import CEOAgent
from app.services.storage import upload_file, sanitize_filename
from app.services.rag_pipeline import process_and_index_document

logger = logging.getLogger("app.routers.agents")
router = APIRouter(prefix="/api/agent", tags=["Multi-Agent Endpoints"])

# Initialize CEO Agent
ceo_agent = CEOAgent()

# Role checkers
is_officer_or_analyst = RoleChecker(["officer", "analyst"])
is_officer = RoleChecker(["officer"])


@router.post("/chat", response_model=ChatResponse)
def execute_agent_chat(
    payload: ChatRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Submits a prompt and optional base64 image to the CEO Agent for coordinator routing.
    Accessible to both authenticated users and citizens.
    """
    user_role = current_user.role if current_user else "citizen"
    session_id = payload.session_id or "default-session"

    image_bytes = None
    if payload.image_base64:
        try:
            encoded_str = payload.image_base64
            if "," in encoded_str:
                encoded_str = encoded_str.split(",")[1]
            # Max base64 payload size check (approx 5MB)
            if len(encoded_str) > 7 * 1024 * 1024:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Attached inspection image exceeds maximum allowable limit (5MB)."
                )
            image_bytes = base64.b64decode(encoded_str)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to decode base64 image: {e}")
            raise HTTPException(status_code=400, detail="Invalid base64 image format")

    try:
        result = ceo_agent.process_request(
            db=db,
            prompt=payload.message,
            image_bytes=image_bytes,
            session_id=session_id,
            user_role=user_role
        )
        return result
    except Exception as e:
        logger.error(f"CEOAgent process_request failure: {e}")
        raise HTTPException(status_code=500, detail=f"Agent coordination failed: {str(e)}")


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_and_index_pdf(
    file: UploadFile = File(...),
    doc_type: str = Form("SOP"),
    current_user: User = Depends(is_officer_or_analyst),
    db: Session = Depends(get_db)
):
    """
    Uploads a government policy/SOP document, GCS-stores it, chunks and embed-indexes it for RAG search.
    Requires Officer or Analyst credentials. Enforces file size, extension, and PDF magic byte verification.
    """
    raw_filename = file.filename or "uploaded_document.pdf"
    clean_filename = sanitize_filename(raw_filename)

    if not clean_filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Only PDF documents (.pdf) are supported for semantic indexing."
        )
        
    try:
        content = await file.read()
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

        if len(content) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Document size ({len(content) / 1024 / 1024:.1f} MB) exceeds maximum allowed size ({settings.MAX_UPLOAD_SIZE_MB} MB)."
            )

        # Validate PDF Magic Bytes (%PDF-)
        if not content.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security validation failed: File content does not match a valid PDF header."
            )
        
        # Upload to Storage (GCS or Local with path traversal protection)
        gcs_path = upload_file(io.BytesIO(content), clean_filename)
        
        # Create RagDocument record
        doc = RagDocument(
            filename=clean_filename,
            gcs_path=gcs_path,
            uploaded_by=current_user.id,
            doc_type=doc_type
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        
        # Trigger text indexing pipeline (chunking + embedding vectors)
        indexing_success = process_and_index_document(db, doc.id, content)
        
        if not indexing_success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="PDF was archived, but text chunking or embedding indexation failed."
            )
            
        return {
            "status": "success",
            "message": f"Document '{clean_filename}' processed and indexed successfully into vector database.",
            "document_id": doc.id,
            "storage_path": gcs_path
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload and index pipeline failed: {e}")
        raise HTTPException(status_code=500, detail=f"Pipeline processing failed: {str(e)}")


@router.get("/workflows", response_model=List[WorkflowResponse])
def get_all_workflows(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Gets list of all active/resolved workflow tickets (available for civic transparency)."""
    return db.query(Workflow).order_by(Workflow.created_at.desc()).all()


@router.post("/workflows", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
def create_new_workflow(
    payload: WorkflowCreate,
    current_user: User = Depends(is_officer),
    db: Session = Depends(get_db)
):
    """Creates a new workflow ticket manually (strictly restricted to Officers)."""
    new_wf = Workflow(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        priority=payload.priority,
        status="Triggered"
    )
    db.add(new_wf)
    db.commit()
    db.refresh(new_wf)
    logger.info(f"Officer {current_user.username} created new workflow ticket '{new_wf.title}' [{new_wf.id}]")
    return new_wf
