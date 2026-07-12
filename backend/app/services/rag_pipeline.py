import logging
import io
from typing import List, Dict, Any
import numpy as np
from sqlalchemy import select
from pypdf import PdfReader

from app.models.models import RagDocument, RagDocumentChunk
from app.services.gemini import get_embedding
from app.services.db import is_sqlite

logger = logging.getLogger("app.services.rag_pipeline")

def extract_text_from_pdf(file_path_or_bytes) -> str:
    """Extracts all text from a PDF file path or file bytes."""
    try:
        reader = PdfReader(file_path_or_bytes)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    except Exception as e:
        logger.error(f"Failed to extract text from PDF: {e}")
        return ""


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> List[str]:
    """Splits a long text string into overlapping chunks."""
    if not text:
        return []
    
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        # Advance by chunk_size - overlap
        start += (chunk_size - overlap)
        
    return chunks


def process_and_index_document(db, doc_id: int, file_content_bytes: bytes) -> bool:
    """
    Extracts text from PDF bytes, chunks it, generates embeddings, 
    and inserts chunks into AlloyDB/SQLite database.
    """
    try:
        # Extract
        text = extract_text_from_pdf(io.BytesIO(file_content_bytes))
        if not text:
            logger.warning("No text extracted from document. Check if PDF is scanned or empty.")
            return False
        
        # Chunk
        chunks = chunk_text(text)
        logger.info(f"Split document {doc_id} into {len(chunks)} chunks.")
        
        # Embed and Insert
        for idx, chunk in enumerate(chunks):
            embedding_vector = get_embedding(chunk)
            
            chunk_model = RagDocumentChunk(
                document_id=doc_id,
                chunk_index=idx,
                content=chunk,
                embedding=embedding_vector,
                metadata_json={"chunk_length": len(chunk)}
            )
            db.add(chunk_model)
            
        db.commit()
        logger.info(f"Successfully indexed document {doc_id} with vector embeddings.")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"RAG document indexing pipeline failed: {e}")
        return False


def retrieve_relevant_chunks(db, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """
    Retrieves the most semantically relevant document chunks matching the user query.
    Falls back to numpy-based similarity search when database is SQLite.
    """
    query_emb = get_embedding(query)
    
    try:
        if not is_sqlite:
            # PostgreSQL pgvector similarity search
            # We select chunks and order by cosine distance
            # Using raw sql/query because pgvector can be accessed via cosine_distance
            # pyrefly: ignore [missing-import]
            from pgvector.sqlalchemy import Vector
            
            # Retrieve with SQLAlchemy
            # pgvector distance operators: <-> (L2), <=> (Cosine), <#> (Inner Product)
            # cosine_distance is model.embedding.cosine_distance(vector)
            stmt = (
                select(RagDocumentChunk, RagDocument.filename)
                .join(RagDocument, RagDocument.id == RagDocumentChunk.document_id)
                .order_by(RagDocumentChunk.embedding.cosine_distance(query_emb))
                .limit(top_k)
            )
            results = db.execute(stmt).all()
            
            response = []
            for row in results:
                chunk = row[0]
                filename = row[1]
                response.append({
                    "chunk_id": chunk.id,
                    "filename": filename,
                    "content": chunk.content,
                    "score": float(1 - getattr(chunk.embedding, "cosine_distance", lambda x: 0.1)(query_emb)) # Sim = 1 - Dist
                })
            return response
            
        else:
            # SQLite fallback: load all and calculate similarity using numpy
            # This ensures local code functions perfectly out-of-the-box
            stmt = select(RagDocumentChunk, RagDocument.filename).join(RagDocument, RagDocument.id == RagDocumentChunk.document_id)
            all_rows = db.execute(stmt).all()
            
            if not all_rows:
                return []
            
            similarities = []
            q_vec = np.array(query_emb)
            
            for chunk, filename in all_rows:
                # Chunk embedding is saved as list or json string
                chunk_emb_list = chunk.embedding
                if isinstance(chunk_emb_list, str):
                    import json
                    chunk_emb_list = json.loads(chunk_emb_list)
                
                c_vec = np.array(chunk_emb_list)
                
                # Compute Cosine Similarity
                dot_val = np.dot(q_vec, c_vec)
                q_norm = np.linalg.norm(q_vec)
                c_norm = np.linalg.norm(c_vec)
                
                sim = dot_val / (q_norm * c_norm) if (q_norm > 0 and c_norm > 0) else 0.0
                similarities.append((sim, chunk, filename))
            
            # Sort by similarity descending
            similarities.sort(key=lambda x: x[0], reverse=True)
            
            # Return top_k
            response = []
            for sim, chunk, filename in similarities[:top_k]:
                response.append({
                    "chunk_id": chunk.id,
                    "filename": filename,
                    "content": chunk.content,
                    "score": float(sim)
                })
            return response
            
    except Exception as e:
        logger.error(f"Vector search retrieval failed: {e}")
        return []
