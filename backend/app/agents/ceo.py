import logging
import json
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from app.services.gemini import generate_content
from app.agents.data import DataAgent
from app.agents.analytics import AnalyticsAgent
from app.agents.prediction import PredictionAgent
from app.agents.rag import RagAgent
from app.agents.workflow import WorkflowAgent
from app.agents.recommendation import RecommendationAgent

logger = logging.getLogger("app.agents.ceo")

class CEOAgent:
    def __init__(self):
        self.name = "CEOAgent"
        self.description = "Central coordinator. Routinely delegates tasks to specialized sub-agents and summarizes response."
        
        # Instantiate sub-agents
        self.data_agent = DataAgent()
        self.analytics_agent = AnalyticsAgent()
        self.prediction_agent = PredictionAgent()
        self.rag_agent = RagAgent()
        self.workflow_agent = WorkflowAgent()
        self.recommendation_agent = RecommendationAgent()

    def process_request(
        self, 
        db: Session, 
        prompt: str, 
        image_bytes: Optional[bytes] = None, 
        session_id: str = "default-session",
        user_role: str = "officer"
    ) -> Dict[str, Any]:
        """
        Receives the user request, decides on the execution plan, invokes specialized sub-agents,
        synthesizes the final output, and logs the decision path.
        """
        logger.info(f"CEOAgent processing request: '{prompt}' for session_id={session_id}, role={user_role}")
        
        agent_flow = []
        sources = []
        collected_data = {}
        
        # 1. Handle Multimodal Input (Gemini Vision)
        if image_bytes:
            agent_flow.append("CEOAgent (Multimodal Analysis)")
            vision_analysis = self._analyze_image(prompt, image_bytes)
            
            # Delegate to recommendation agent to get actions based on the image analysis
            agent_flow.append("RecommendationAgent (Mitigation Strategies)")
            rec_result = self.recommendation_agent.generate_mitigation_strategies(
                sector="General / Environmental",
                incident_details=vision_analysis,
                severity="Medium"
            )
            
            final_prompt = f"""
            Synthesize a response based on the image analysis and recommendations.
            Image Analysis: {vision_analysis}
            Recommendations: {json.dumps(rec_result)}
            """
            response = generate_content(final_prompt, system_instruction="You are a smart city supervisor assistant.")
            
            # Log the decision
            self.data_agent.log_agent_decision(
                db=db,
                session_id=session_id,
                agent_name=self.name,
                prompt=prompt,
                response=response,
                confidence_score=0.90,
                sources=["Gemini Vision Analyzer"]
            )
            
            return {
                "response": response,
                "confidence_score": 0.90,
                "sources": [{"filename": "Uploaded Image Analysis", "score": 0.90}],
                "agent_flow": agent_flow,
                "data": {"image_analysis": vision_analysis, "recommendations": rec_result}
            }

        # 2. Category classification to direct standard queries
        classification_prompt = f"""
        Classify this smart city administrative request into one or more categories:
        Request: "{prompt}"
        
        Categories to choose from:
        - "RAG": Asking about PDF guidelines, policy documents, SOP manuals, schemes.
        - "ANALYTICS": Asking for dashboard statistics, counts, reports, grievances summaries.
        - "PREDICTION": Asking for future trends, forecast predictions, anomaly risk warnings.
        - "WORKFLOW": Requesting action plans, triggering tickets, alerts dispatch.
        - "GENERAL": Routine conversation or greeting.
        
        Return a JSON list of categories, e.g., ["RAG"] or ["ANALYTICS", "PREDICTION"].
        Output ONLY the raw JSON array. No markdown code blocks.
        """
        
        classification_response = generate_content(classification_prompt)
        try:
            cleaned = classification_response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            categories = json.loads(cleaned.strip())
        except Exception:
            # Fallback keyword checks
            categories = []
            prompt_l = prompt.lower()
            if any(k in prompt_l for k in ["guideline", "sop", "policy", "scheme", "document", "pdf"]):
                categories.append("RAG")
            if any(k in prompt_l for k in ["statistic", "metric", "grievance", "sensor", "total", "count"]):
                categories.append("ANALYTICS")
            if any(k in prompt_l for k in ["predict", "forecast", "trend", "risk", "anomaly"]):
                categories.append("PREDICTION")
            if any(k in prompt_l for k in ["trigger", "ticket", "workflow", "alert", "escalate"]):
                categories.append("WORKFLOW")
            if not categories:
                categories = ["GENERAL"]

        logger.info(f"CEOAgent classified request categories: {categories}")
        
        # 3. Dispatch to sub-agents based on classification
        sub_responses = []
        
        if "RAG" in categories:
            agent_flow.append("RagAgent (Policy RAG Search)")
            rag_res = self.rag_agent.query_policy_knowledge_base(db, prompt)
            sub_responses.append(f"RAG Knowledge Base Answer: {rag_res['answer']}")
            for src in rag_res["sources"]:
                sources.append(src)
            collected_data["rag_sources"] = rag_res["sources"]
            
        if "ANALYTICS" in categories:
            agent_flow.append("AnalyticsAgent (BigQuery Analytics)")
            # Extract possible parameters
            sector = "water" if "water" in prompt.lower() else ("traffic" if "traffic" in prompt.lower() else "grievances")
            ward_id = 101 # default
            for word in prompt.split():
                if word.isdigit() and len(word) == 3:
                    ward_id = int(word)
            
            if sector == "grievances":
                insights = self.analytics_agent.get_grievance_insights(ward_id=ward_id)
            else:
                insights = self.analytics_agent.get_iot_telemetry_insights(metric_type=sector, ward_id=ward_id)
                
            sub_responses.append(f"BigQuery Telemetry Insights: {json.dumps(insights[:3])}")
            sources.append({"filename": "BigQuery Analytics Logs", "score": 0.95})
            collected_data["analytics_data"] = insights[:10]

        if "PREDICTION" in categories:
            agent_flow.append("PredictionAgent (Gemini/Vertex Forecast)")
            sector = "traffic" if "traffic" in prompt.lower() else ("water" if "water" in prompt.lower() else "grievances")
            ward_id = 101
            pred_res = self.prediction_agent.predict_sector_load(sector, ward_id)
            sub_responses.append(f"Forecast Predictions: {pred_res['forecast_summary']} (Confidence: {pred_res['confidence_score']})")
            sources.append({"filename": f"ML Forecaster: {sector}", "score": pred_res['confidence_score']})
            collected_data["prediction_data"] = pred_res
            
            # If anomaly risk is high, recommend strategies
            if pred_res.get("anomaly_risk_score", 0) > 0.6:
                agent_flow.append("RecommendationAgent (Decision Support)")
                rec_res = self.recommendation_agent.generate_mitigation_strategies(sector, pred_res["forecast_summary"], "High")
                sub_responses.append(f"Mitigation Suggestions: {json.dumps(rec_res)}")
                collected_data["recommendations"] = rec_res

        if "WORKFLOW" in categories:
            agent_flow.append("WorkflowAgent (Automation Tasks)")
            # Trigger escalation
            sector = "Water" if "water" in prompt.lower() else ("Traffic" if "traffic" in prompt.lower() else "Grievance")
            wf_res = self.workflow_agent.trigger_incident_escalation(
                db=db,
                category=sector,
                ward_id=101,
                priority="High",
                details=prompt
            )
            sub_responses.append(f"Automated Workflow Status: {wf_res['message']}. Created Ticket ID: {wf_res['ticket']['id']}")
            sources.append({"filename": "AlloyDB Workflow DB", "score": 0.98})
            collected_data["workflow_ticket"] = wf_res["ticket"]
            collected_data["workflow_alerts"] = wf_res["broadcast_details"]
            
        if "GENERAL" in categories or not sub_responses:
            agent_flow.append("CEOAgent (Direct reasoning)")
            # Direct conversational prompt

        # 4. Synthesize final response
        synthesis_prompt = f"""
        You are the Chief Executive Officer Agent (CEO Agent) of the Smart City Decision Intelligence Platform.
        Assemble a premium, detailed response for the Administrative Officer based on the user request and sub-agent findings:
        
        User Request: "{prompt}"
        Sub-Agent Findings:
        {" | ".join(sub_responses)}
        
        Ensure the output is written in standard Markdown and contains:
        1. Executive Summary
        2. Sector Analysis & Metrics (if analytical/predictive data was queried)
        3. Policy Guidelines & References (if RAG was queried)
        4. Operational Actions Taken (if workflows were triggered)
        5. Explainable AI (XAI) Insight explaining how the platform parsed the request
        
        Add clear markdown references to citations if any were returned.
        """
        
        final_response = generate_content(
            prompt=synthesis_prompt,
            system_instruction="You are the lead smart city director. You deliver clear, actionable, executive briefings to district officers with citations and data breakdowns."
        )
        
        # Calculate overall confidence score
        confidence_values = [s["score"] for s in sources if "score" in s]
        confidence = sum(confidence_values) / len(confidence_values) if confidence_values else 0.85
        
        # 5. Log decision audit trail
        self.data_agent.log_agent_decision(
            db=db,
            session_id=session_id,
            agent_name=self.name,
            prompt=prompt,
            response=final_response,
            confidence_score=confidence,
            sources=sources
        )
        
        return {
            "response": final_response,
            "confidence_score": round(confidence, 2),
            "sources": sources,
            "agent_flow": agent_flow,
            "data": collected_data
        }

    def _analyze_image(self, prompt: str, image_bytes: bytes) -> str:
        """Invokes Gemini Vision to analyze municipal images (potholes, structural damage, water logging)."""
        vision_prompt = f"""
        Perform a thorough structural and environmental inspection of this image.
        Identify any urban anomalies, damage, hazard issues, or maintenance concerns (e.g. garbage piles, road damage, structural issues, broken lights, flooding).
        Relate the inspection findings to this query: "{prompt}"
        """
        response = generate_content(
            prompt=vision_prompt,
            image_bytes=image_bytes,
            system_instruction="You are an expert urban infrastructure inspector and civic hazard advisor."
        )
        return response
