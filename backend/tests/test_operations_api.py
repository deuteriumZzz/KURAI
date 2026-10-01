from unittest.mock import patch

from django.test import Client
from django.test.utils import override_settings
from django.utils import timezone

from model_catalog.models import CatalogModel


def test_public_health_and_readiness_expose_only_safe_service_state(db):
    client = Client()

    health = client.get("/api/v1/health")
    ready = client.get("/api/v1/ready")

    assert health.status_code == 200
    assert health.json() == {"data": {"service": "kurai-api", "status": "ok", "version": "v1"}}
    assert ready.status_code == 200
    assert ready.json() == {"data": {"service": "kurai-api", "status": "ready", "version": "v1"}}
    assert "password" not in ready.content.decode("utf-8").lower()


@patch("kurai.api.database_ready", return_value=False)
def test_readiness_is_503_without_leaking_a_dependency_error(database_ready, db):
    response = Client().get("/api/v1/ready")

    assert database_ready.called
    assert response.status_code == 503
    assert response.json() == {"error": {"code": "service_unavailable", "message": "Сервис временно недоступен."}}


def test_request_id_is_a_uuid_and_an_invalid_client_value_is_replaced(db):
    client = Client()

    generated = client.get("/api/v1/health")
    replaced = client.get("/api/v1/health", HTTP_X_REQUEST_ID="not-a-valid-request-id\nunsafe")

    assert generated["X-Request-ID"]
    assert replaced["X-Request-ID"]
    assert replaced["X-Request-ID"] != "not-a-valid-request-id\nunsafe"


@override_settings(OPENROUTER_API_KEY="test-key", KURAI_CATALOG_MAX_AGE_SECONDS=3600)
def test_status_reports_a_current_configured_catalog_as_operational(db):
    CatalogModel.objects.all().delete()
    CatalogModel.objects.create(
        id="acme/current", name="Current", provider="Acme", input_modalities=["text"], output_modalities=["text"], synced_at=timezone.now(),
    )

    response = Client().get("/api/v1/status")

    assert response.status_code == 200
    assert response.json()["data"]["status"] == "ok"
    assert response.json()["data"]["reasons"] == []


@override_settings(OPENROUTER_API_KEY="", KURAI_CATALOG_MAX_AGE_SECONDS=3600)
def test_status_reports_degraded_without_a_provider_key_or_catalog(db):
    CatalogModel.objects.all().delete()
    response = Client().get("/api/v1/status")

    assert response.status_code == 200
    assert response.json()["data"] == {
        "status": "degraded",
        "modelsOnline": 0,
        "capabilities": [
            {"id": "text", "available": False, "modelCount": 0},
            {"id": "research", "available": False, "modelCount": 0},
            {"id": "slides", "available": False, "modelCount": 0},
            {"id": "image", "available": False, "modelCount": 0},
            {"id": "video", "available": False, "modelCount": 0},
            {"id": "audio", "available": False, "modelCount": 0},
        ],
        "reasons": ["catalog_empty", "provider_not_configured"],
    }
