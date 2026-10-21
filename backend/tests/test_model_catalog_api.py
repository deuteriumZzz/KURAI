from django.contrib.auth import get_user_model
from django.test import Client
from django.test.utils import override_settings

from model_catalog.models import CatalogModel


def signed_in_client():
    member = get_user_model().objects.create_user(email="catalog@example.test", password="safe-test-password")
    client = Client()
    client.force_login(member)
    return member, client


def test_models_endpoint_lists_only_active_chat_models(db):
    _, client = signed_in_client()
    CatalogModel.objects.create(
        id="acme/chat-pro",
        name="Chat Pro",
        provider="Acme",
        input_modalities=["text"],
        output_modalities=["text"],
        prompt_price_usd_per_token="0.000001",
        completion_price_usd_per_token="0.000002",
    )
    CatalogModel.objects.create(
        id="acme/image-only",
        name="Image Only",
        provider="Acme",
        input_modalities=["text"],
        output_modalities=["image"],
        active=True,
    )
    CatalogModel.objects.create(
        id="acme/retired",
        name="Retired",
        provider="Acme",
        input_modalities=["text"],
        output_modalities=["text"],
        active=False,
    )

    response = client.get("/api/v1/models?mode=text")

    assert response.status_code == 200
    ids = {model["id"] for model in response.json()["data"]}
    assert "acme/chat-pro" in ids
    assert "acme/image-only" not in ids
    assert "acme/retired" not in ids


def test_quote_binds_the_selected_catalog_model_and_run_rejects_swapped_model(db):
    member, client = signed_in_client()
    CatalogModel.objects.create(
        id="acme/chat-pro",
        name="Chat Pro",
        provider="Acme",
        input_modalities=["text"],
        output_modalities=["text"],
        prompt_price_usd_per_token="0.000001",
        completion_price_usd_per_token="0.000002",
    )
    from ledger.services import grant_credits
    from workspace.models import Chat

    grant_credits(member, 100_000, correlation_id="catalog-grant")
    chat = Chat.objects.create(owner=member, title="Model chat")
    quote = client.post(
        "/api/v1/runs/quote",
        data={"mode": "text", "modelId": "acme/chat-pro", "text": "Собери краткий план"},
        content_type="application/json",
    )

    assert quote.status_code == 200
    payload = quote.json()["data"]
    assert payload["resolvedModel"] == "acme/chat-pro"
    assert payload["estimatedCostMicro"] > 0

    swapped = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": payload["quoteId"], "mode": "text", "modelId": "openrouter/auto", "text": "Собери краткий план"},
        content_type="application/json",
        headers={"Idempotency-Key": "catalog-model-swap"},
    )

    assert swapped.status_code == 409
    assert swapped.json()["error"]["code"] == "quote_expired"


def test_public_capabilities_do_not_claim_unconfigured_image_or_media_modes(db):
    CatalogModel.objects.create(
        id="acme/image-only",
        name="Image Only",
        provider="Acme",
        input_modalities=["text"],
        output_modalities=["image"],
        active=True,
    )

    response = Client().get("/api/v1/capabilities")

    assert response.status_code == 200
    modes = {capability["id"]: capability for capability in response.json()["data"]["modes"]}
    assert modes["text"]["available"] is True
    assert modes["image"] == {"id": "image", "available": False, "modelCount": 1}
    assert modes["video"] == {"id": "video", "available": False, "modelCount": 0}


@override_settings(OPENROUTER_API_KEY="test-key")
def test_capabilities_and_public_status_reflect_a_configured_image_catalog(db):
    CatalogModel.objects.create(
        id="acme/image-only",
        name="Image Only",
        provider="Acme",
        input_modalities=["text"],
        output_modalities=["image"],
        active=True,
    )

    capabilities = Client().get("/api/v1/capabilities")
    status = Client().get("/api/v1/status")

    modes = {capability["id"]: capability for capability in capabilities.json()["data"]["modes"]}
    assert modes["image"] == {"id": "image", "available": True, "modelCount": 1}
    assert status.status_code == 200
    assert status.json()["data"]["modelsOnline"] >= 2
    assert {capability["id"]: capability for capability in status.json()["data"]["capabilities"]} == modes


def test_catalog_is_readable_without_signing_in(db):
    CatalogModel.objects.create(
        id="acme/chat-pro",
        name="Chat Pro",
        provider="Acme",
        input_modalities=["text"],
        output_modalities=["text"],
        prompt_price_usd_per_token="0.000001",
        completion_price_usd_per_token="0.000002",
    )

    response = Client().get("/api/v1/models?mode=text")

    assert response.status_code == 200
    models = {model["id"]: model for model in response.json()["data"]}
    assert models["acme/chat-pro"]["priceKnown"] is True


def test_price_hint_is_available_without_signing_in(db):
    CatalogModel.objects.create(
        id="acme/chat-pro",
        name="Chat Pro",
        provider="Acme",
        input_modalities=["text"],
        output_modalities=["text"],
        prompt_price_usd_per_token="0.000001",
        completion_price_usd_per_token="0.000002",
    )

    response = Client().post("/api/v1/runs/estimate", {"mode": "text", "modelId": "acme/chat-pro", "chars": 500}, content_type="application/json")

    assert response.status_code == 200
    assert response.json()["data"]["estimatedCostMicro"] > 0
