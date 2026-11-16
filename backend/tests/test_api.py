import pytest

def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "database" in data
    assert "gemini_engine" in data

def test_demo_token_issuance(client):
    # Test officer token
    res_officer = client.post("/api/auth/demo-token", json={"role": "officer"})
    assert res_officer.status_code == 200
    assert "access_token" in res_officer.json()
    assert res_officer.json()["role"] == "officer"

    # Test citizen token
    res_citizen = client.post("/api/auth/demo-token", json={"role": "citizen"})
    assert res_citizen.status_code == 200
    assert res_citizen.json()["role"] == "citizen"

def test_dashboard_metrics_endpoint(client):
    res = client.get("/api/dashboard/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "total_tickets" in data
    assert "grievances_by_category" in data
    assert "iot_sensors_status" in data

def test_workflow_lifecycle_and_rbac(client, officer_token, citizen_token):
    # 1. Officer creates a workflow
    headers_officer = {"Authorization": f"Bearer {officer_token}"}
    create_payload = {
        "title": "Automated Unit Test Incident",
        "category": "Water",
        "priority": "High",
        "description": "Triggered during CI/CD test run"
    }
    create_res = client.post("/api/agent/workflows", json=create_payload, headers=headers_officer)
    assert create_res.status_code == 201
    ticket_id = create_res.json()["id"]

    # 2. Retrieve workflows list
    list_res = client.get("/api/agent/workflows", headers=headers_officer)
    assert list_res.status_code == 200
    assert any(w["id"] == ticket_id for w in list_res.json())

    # 3. Citizen attempted workflow creation must be rejected with 403 Forbidden
    headers_citizen = {"Authorization": f"Bearer {citizen_token}"}
    unauth_res = client.post("/api/agent/workflows", json=create_payload, headers=headers_citizen)
    assert unauth_res.status_code == 403

def test_agent_chat_endpoint(client, officer_token):
    headers = {"Authorization": f"Bearer {officer_token}"}
    payload = {
        "message": "Is there any water anomaly in Ward 102?",
        "session_id": "test-chat-session"
    }
    res = client.post("/api/agent/chat", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "response" in data
    assert "confidence_score" in data
    assert "agent_flow" in data
