from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_reports_model_state() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "models_loaded" in body


def test_endpoints_refuse_to_guess_without_models() -> None:
    response = client.post("/ai/classify", json={"description": "pothole on main road"})
    assert response.status_code == 503
