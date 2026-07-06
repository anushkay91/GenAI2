import base64
import logging
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.services.db import get_db
from app.routers.auth import get_current_user, RoleChecker
from app.models.models import User, RagDocument, Workflow
from app.schemas import ChatRequest, ChatResponse, WorkflowResponse, WorkflowCreate
from app.agents.ceo import CEOAgent
from app.services.storage import upload_file
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits a prompt and optional base64 image to the CEO Agent for coordinator routing.
    """
    image_bytes = None
    if payload.image_base64:
        try:
            # Strip prefix if base64 includes data:image/jpeg;base64,...
            encoded_str = payload.image_base64
            if "," in encoded_str:
                encoded_str = encoded_str.split(",")[1]
            image_bytes = base64.b64decode(encoded_str)
        except Exception as e:
            logger.error(f"Failed to decode base64 image: {e}")
            raise HTTPException(status_code=400, detail="Invalid base64 image format")

    try:
        # Run CEO Agent orchestration
        result = ceo_agent.process_request(
            db=db,
            prompt=payload.message,
            image_bytes=image_bytes,
            session_id=payload.session_id,
            user_role=current_user.role
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
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for indexing.")
        
    try:
        # Read file contents
        content = await file.read()
        
        # Upload to Storage (GCS/Local fallback)
        import io
        gcs_path = upload_file(io.BytesIO(content), file.filename)
        
        # Create RagDocument record
        doc = RagDocument(
            filename=file.filename,
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
                status_code=500, 
                detail="PDF was archived, but text chunking or embedding indexation failed."
            )
            
        return {
            "status": "success",
            "message": f"Document '{file.filename}' processed and indexed successfully into vector database.",
            "document_id": doc.id,
            "storage_path": gcs_path
        }
    except Exception as e:
        logger.error(f"File upload and index pipeline failed: {e}")
        raise HTTPException(status_code=500, detail=f"Pipeline processing failed: {str(e)}")


@router.get("/workflows", response_model=List[WorkflowResponse])
def get_all_workflows(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gets list of all active/resolved workflow tickets."""
    return db.query(Workflow).order_by(Workflow.created_at.desc()).all()


@router.post("/workflows", response_model=WorkflowResponse)
def create_new_workflow(
    payload: WorkflowCreate,
    current_user: User = Depends(is_officer),
    db: Session = Depends(get_db)
):
    """Creates a new workflow ticket manually (restricted to Officers)."""
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
    return new_wf
