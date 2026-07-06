import datetime
import uuid
import json
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float, JSON, Boolean
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.types import TypeDecorator, VARCHAR

Base = declarative_base()

# Dynamic handling of pgvector vs SQLite fallback
try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False

class SafeVector(TypeDecorator):
    """
    Custom type decorator that uses pgvector.sqlalchemy.Vector when running on PostgreSQL,
    and falls back to JSON-serialized VARCHAR (or TEXT) when running on SQLite.
    """
    impl = Text
    cache_ok = True

    def __init__(self, dim=768):
        super().__init__()
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql" and HAS_PGVECTOR:
            return dialect.type_descriptor(Vector(self.dim))
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql" and HAS_PGVECTOR:
            return value  # pgvector handles lists directly
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql" and HAS_PGVECTOR:
            return value
        return json.loads(value)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="citizen")  # "officer", "analyst", "citizen"
    department = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    documents = relationship("RagDocument", back_populates="uploader")


class RagDocument(Base):
    __tablename__ = "rag_documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    gcs_path = Column(String(512), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    doc_type = Column(String(50))  # "SOP", "Scheme", "Policy", "Minutes"
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    uploader = relationship("User", back_populates="documents")
    chunks = relationship("RagDocumentChunk", back_populates="document", cascade="all, delete-orphan")


class RagDocumentChunk(Base):
    __tablename__ = "rag_document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("rag_documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(SafeVector(768), nullable=False)  # 768 dim for Vertex AI embeddings
    metadata_json = Column(JSON, nullable=True)

    document = relationship("RagDocument", back_populates="chunks")


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)  # "Water", "Waste", "Traffic", "Security"
    status = Column(String(50), default="Triggered")  # "Triggered", "In Progress", "Resolved", "Failed"
    priority = Column(String(20), default="Medium")  # "Low", "Medium", "High", "Critical"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class AgentDecisionLog(Base):
    __tablename__ = "agent_decision_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), nullable=False, index=True)
    agent_name = Column(String(50), nullable=False)
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    confidence_score = Column(Float, nullable=False)
    sources = Column(JSON, nullable=True)  # References to chunks or analytical queries
    cost_estimation = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
