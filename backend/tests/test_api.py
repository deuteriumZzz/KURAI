from django.test import Client
from django.contrib.auth import get_user_model


def test_health_is_public_and_reports_api_version():
    response = Client().get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"data": {"service": "kurai-api", "status": "ok", "version": "v1"}}


def test_quote_requires_a_signed_in_member():
    response = Client().post("/api/v1/runs/quote", data="{}", content_type="application/json")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_required"


def test_member_receives_a_server_authoritative_text_quote(db):
    member = get_user_model().objects.create_user(email="dmitry@example.test", password="safe-test-password")
    client = Client()
    client.force_login(member)

    response = client.post("/api/v1/runs/quote", data={"mode": "text", "text": "Сравни три тарифа"}, content_type="application/json")

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["mode"] == "text"
    assert payload["estimatedCostMicro"] > 0
    assert payload["resolvedModel"] == "openrouter/auto"


def test_quote_rejects_empty_or_unknown_requests(db):
    member = get_user_model().objects.create_user(email="irina@example.test", password="safe-test-password")
    client = Client()
    client.force_login(member)

    response = client.post("/api/v1/runs/quote", data={"mode": "unknown", "text": ""}, content_type="application/json")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
