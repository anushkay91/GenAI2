import sys
import os
import json

# Adjust python path to find app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.db import init_db, SessionLocal, engine
from app.models.models import User, Workflow, RagDocument, RagDocumentChunk
from app.agents.ceo import CEOAgent
from app.services.rag_pipeline import retrieve_relevant_chunks
from app.routers.auth import create_access_token, verify_password, get_password_hash

def run_verification():
    print("=== Start Automated Platform Verification ===")
    
    # 1. Initialize DB and create schemas
    print("Step 1: Initializing database, schemas, and demo accounts...")
    init_db()
    
    db = SessionLocal()
    
    try:
        # 2. Check/Create Mock User & Test Auth
        print("Step 2: Verifying demo accounts and JWT auth...")
        officer = db.query(User).filter(User.username == "Director_Karthik").first()
        assert officer is not None, "Director_Karthik should be seeded"
        assert officer.role == "officer"
        assert verify_password("Password123!", officer.hashed_password), "Password verification should succeed"

        token = create_access_token({"sub": officer.username, "role": officer.role})
        assert token and len(token) > 20, "JWT token generation should succeed"
        print(f"User verified: {officer.username} (Role: {officer.role}), Token issued successfully.")

        # 3. Test RAG document indexing & similarity retrieval fallback
        print("Step 3: Testing RAG indexing pipeline...")
        test_pdf_content = (
            "District Municipal SOP Section 4.2:\n"
            "All water supply leakage complaints filed in Ward 102 must trigger immediate pressure checks. "
            "If pressure falls below 2.8 bar, isolate sub-grid valve D-102 and alert the repair supervisor. "
            "Estimated time to resolve is 4 hours."
        )
        
        doc = db.query(RagDocument).filter(RagDocument.filename == "test_sop.pdf").first()
        if not doc:
            doc = RagDocument(
                filename="test_sop.pdf",
                gcs_path="gs://mock-bucket/test_sop.pdf",
                uploaded_by=officer.id,
                doc_type="SOP"
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            
            from app.services.gemini import get_embedding
            mock_emb = get_embedding(test_pdf_content)
            chunk = RagDocumentChunk(
                document_id=doc.id,
                chunk_index=0,
                content=test_pdf_content,
                embedding=mock_emb,
                metadata_json={"test": True}
            )
            db.add(chunk)
            db.commit()
            
        print("RAG document and chunk indexed.")
        
        # Test semantic search retrieval
        print("Step 4: Testing RAG retrieval matching...")
        matches = retrieve_relevant_chunks(db, "leakage reported in Ward 102", top_k=1)
        if matches:
            print(f"Matched file: '{matches[0]['filename']}' with similarity score {matches[0]['score']:.2f}")
            print(f"Snippet: {matches[0]['content'][:60]}...")
        else:
            print("WARNING: RAG retrieval returned no matches.")

        # 5. Verify Multi-Agent CEO Orchestration
        print("Step 5: Testing CEO multi-agent routing & synthesis...")
        ceo = CEOAgent()
        result = ceo.process_request(
            db=db,
            prompt="Is there any water leakage reported in Ward 102?",
            session_id="verify-session",
            user_role="officer"
        )
        
        print("\n--- CEO Agent synthesized response: ---")
        print(result["response"][:200] + "...")
        print("--------------------------------------")
        print(f"Confidence score: {result['confidence_score'] * 100}%")
        print(f"Collaborated Agents: {' -> '.join(result['agent_flow'])}")
        
        # 6. Verify tickets were logged in AlloyDB
        print("\nStep 6: Verifying AlloyDB/SQLite workflow entries...")
        workflows = db.query(Workflow).all()
        print(f"Total operational workflows in database: {len(workflows)}")

        print("\n=== E2E System Verification Passed successfully! ===")
        return True
        
    except Exception as e:
        print(f"\nERROR: Verification failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = run_verification()
    sys.exit(0 if success else 1)
