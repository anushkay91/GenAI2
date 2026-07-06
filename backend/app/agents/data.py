import logging
from sqlalchemy.orm import Session
from app.models.models import Workflow, AgentDecisionLog
import json

logger = logging.getLogger("app.agents.data")

class DataAgent:
    def __init__(self):
        self.name = "DataAgent"
        self.description = "Manages and updates operational tickets, workflows, and logs in AlloyDB."

    def list_active_workflows(self, db: Session):
        """Retrieves list of active smart city workflows and incidents from AlloyDB."""
        try:
            workflows = db.query(Workflow).all()
            return [
                {
                    "id": w.id,
                    "title": w.title,
                    "description": w.description,
                    "category": w.category,
                    "status": w.status,
                    "priority": w.priority,
                    "updated_at": w.updated_at.isoformat()
                }
                for w in workflows
            ]
        except Exception as e:
            logger.error(f"DataAgent list_active_workflows failed: {e}")
            return {"error": str(e)}

    def create_workflow_ticket(self, db: Session, title: str, description: str, category: str, priority: str = "Medium"):
        """Creates a new operational workflow/ticket in AlloyDB."""
        try:
            workflow = Workflow(
                title=title,
                description=description,
                category=category,
                priority=priority,
                status="Triggered"
            )
            db.add(workflow)
            db.commit()
            db.refresh(workflow)
            logger.info(f"DataAgent created workflow ticket {workflow.id}")
            return {
                "status": "success",
                "message": "Operational workflow ticket created successfully.",
                "ticket": {
                    "id": workflow.id,
                    "title": workflow.title,
                    "category": workflow.category,
                    "priority": workflow.priority,
                    "status": workflow.status
                }
            }
        except Exception as e:
            db.rollback()
            logger.error(f"DataAgent create_workflow_ticket failed: {e}")
            return {"error": str(e)}

    def update_workflow_status(self, db: Session, ticket_id: str, status: str):
        """Updates the operational status of an existing ticket in AlloyDB (e.g. 'In Progress', 'Resolved')."""
        try:
            workflow = db.query(Workflow).filter(Workflow.id == ticket_id).first()
            if not workflow:
                return {"error": f"Ticket with ID {ticket_id} not found."}
            
            old_status = workflow.status
            workflow.status = status
            db.commit()
            logger.info(f"DataAgent updated ticket {ticket_id} status from {old_status} to {status}")
            return {
                "status": "success",
                "ticket_id": ticket_id,
                "old_status": old_status,
                "new_status": status
            }
        except Exception as e:
            db.rollback()
            logger.error(f"DataAgent update_workflow_status failed: {e}")
            return {"error": str(e)}

    def log_agent_decision(self, db: Session, session_id: str, agent_name: str, prompt: str, response: str, confidence_score: float, sources: list = None):
        """Creates a responsible AI audit trail log in AlloyDB."""
        try:
            log = AgentDecisionLog(
                session_id=session_id,
                agent_name=agent_name,
                prompt=prompt,
                response=response,
                confidence_score=confidence_score,
                sources=sources or [],
                cost_estimation=0.0015  # average API call cost
            )
            db.add(log)
            db.commit()
            return {"status": "success", "log_id": log.id}
        except Exception as e:
            db.rollback()
            logger.error(f"DataAgent log_agent_decision failed: {e}")
            return {"error": str(e)}
