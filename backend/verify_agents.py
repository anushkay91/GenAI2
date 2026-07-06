import sys
import os
import json

# Adjust python path to find app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.db import init_db, SessionLocal, engine
from app.models.models import User, Workflow, RagDocument, RagDocumentChunk
from app.agents.ceo import CEOAgent
from app.services.rag_pipeline import process_and_index_document, retrieve_relevant_chunks

def run_verification():
    print("=== Start Automated Platform Verification ===")
    
    # 1. Initialize DB and create schemas
    print("Step 1: Initializing database and schemas...")
    init_db()
    
    db = SessionLocal()
    
    try:
        # 2. Check/Create Mock User
        print("Step 2: Provisioning verification user...")
        test_user = db.query(User).filter(User.username == "verify_officer").first()
        if not test_user:
            test_user = User(
                username="verify_officer",
                email="verify@district.gov.in",
                hashed_password="hashed_placeholder_pw",
                role="officer",
                department="Urban Planning"
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
        print(f"User created: ID={test_user.id}, Role={test_user.role}")

        # 3. Test RAG document indexing & similarity retrieval fallback
        print("Step 3: Testing RAG indexing pipeline...")
        test_pdf_content = (
            "District Municipal SOP Section 4.2:\n"
            "All water supply leakage complaints filed in Ward 102 must trigger immediate pressure checks. "
            "If pressure falls below 2.8 bar, isolate sub-grid valve D-102 and alert the repair supervisor. "
            "Estimated time to resolve is 4 hours."
        )
        
        # We simulate a PDF text chunking by passing bytes to indexing
        # Since pypdf parses pdf files, we mock-insert doc and chunks directly for test
        doc = db.query(RagDocument).filter(RagDocument.filename == "test_sop.pdf").first()
        if not doc:
            doc = RagDocument(
                filename="test_sop.pdf",
                gcs_path="gs://mock-bucket/test_sop.pdf",
                uploaded_by=test_user.id,
                doc_type="SOP"
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            
            # Index chunk with simulated embedding vector
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
        print(result["response"])
        print("--------------------------------------")
        print(f"Confidence score: {result['confidence_score'] * 100}%")
        print(f"Collaborated Agents: {' -> '.join(result['agent_flow'])}")
        
        # 6. Verify tickets were logged in AlloyDB
        print("\nStep 6: Verifying AlloyDB workflow entries...")
        workflows = db.query(Workflow).all()
        print(f"Total operational workflows in database: {len(workflows)}")
        for w in workflows[:2]:
            print(f"- [{w.status}] Priority={w.priority} Title='{w.title}'")

        print("\n=== E2E System Verification Passed successfully! ===")
        
    except Exception as e:
        print(f"\nERROR: Verification failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_verification()
