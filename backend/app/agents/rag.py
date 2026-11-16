import logging
from sqlalchemy.orm import Session
from app.services.rag_pipeline import retrieve_relevant_chunks
from app.services.gemini import generate_content

logger = logging.getLogger("app.agents.rag")

class RagAgent:
    def __init__(self):
        self.name = "RagAgent"
        self.description = "Retrieves information from smart city SOPs, government circulars, and policy documents."

    def query_policy_knowledge_base(self, db: Session, query: str) -> dict:
        """
        Queries the pgvector document index for chunks relevant to the user query,
        summarizes findings via Gemini, and returns citations.
        """
        logger.info(f"RagAgent executing knowledge retrieval for query: {query}")
        
        # 1. Fetch relevant chunks from pgvector database
        chunks = retrieve_relevant_chunks(db, query, top_k=3)
        
        if not chunks:
            return {
                "answer": "No relevant policy documents, schemes, or SOP guidelines were found in the knowledge base.",
                "sources": [],
                "confidence_score": 0.0
            }
            
        # 2. Build context from retrieved chunks
        context_str = ""
        sources = []
        for idx, chunk in enumerate(chunks):
            context_str += f"Source [{idx+1}]: File: {chunk['filename']}\nContent: {chunk['content']}\n\n"
            sources.append({
                "filename": chunk["filename"],
                "score": chunk["score"]
            })
            
        # 3. Formulate retrieval synthesis prompt
        prompt = f"""
        You are a policy advisor. Answer the user's question using ONLY the provided sources. 
        If the sources do not contain the answer, say "Based on the uploaded policy documents, I cannot find this information."
        
        Context sources:
        {context_str}
        
        Question: {query}
        """
        
        # 4. Generate answer
        answer = generate_content(
            prompt=prompt,
            system_instruction="You are a precise public administration assistant. You answer municipal SOP/policy questions strictly grounded in the provided reference materials."
        )
        
        # Compute aggregate confidence based on chunk relevance scores
        avg_score = sum(s["score"] for s in sources) / len(sources) if sources else 0.0
        
        return {
            "answer": answer,
            "sources": sources,
            "confidence_score": round(avg_score, 2)
        }
