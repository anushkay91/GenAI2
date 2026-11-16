import pytest
from app.agents.ceo import CEOAgent
from app.agents.prediction import PredictionAgent
from app.agents.recommendation import RecommendationAgent
from app.agents.analytics import AnalyticsAgent

def test_analytics_agent_query():
    agent = AnalyticsAgent()
    grievances = agent.get_grievance_insights(category="Potholes & Roads", ward_id=101)
    assert isinstance(grievances, list)
    assert len(grievances) > 0

    telemetry = agent.get_iot_telemetry_insights(metric_type="water_flow", ward_id=101)
    assert isinstance(telemetry, list)
    assert len(telemetry) > 0

def test_prediction_agent():
    agent = PredictionAgent()
    pred = agent.predict_sector_load("traffic", 101)
    assert isinstance(pred, dict)
    assert "forecast_summary" in pred
    assert "confidence_score" in pred
    assert pred["confidence_score"] >= 0.0

def test_recommendation_agent():
    agent = RecommendationAgent()
    recs = agent.generate_mitigation_strategies("Water", "14% pressure drop", "High")
    assert isinstance(recs, dict)
    assert "immediate_actions" in recs
    assert "remedial_actions" in recs
    assert len(recs["immediate_actions"]) > 0

def test_ceo_agent_coordination(db_session):
    ceo = CEOAgent()
    res = ceo.process_request(
        db=db_session,
        prompt="Are there any water leakages reported in Ward 102?",
        session_id="test-session",
        user_role="officer"
    )
    assert isinstance(res, dict)
    assert "response" in res
    assert "confidence_score" in res
    assert "agent_flow" in res
    assert len(res["agent_flow"]) > 0
