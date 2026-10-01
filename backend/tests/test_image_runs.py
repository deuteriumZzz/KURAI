from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import Client
from django.test.utils import override_settings

from ledger.services import available_balance_micro, grant_credits
from model_catalog.models import CatalogModel
from media.models import GeneratedAsset
from runs.models import Run, RunEvent
from runs.providers.openrouter import ImageGeneration
from runs.worker import process_run
from workspace.models import Chat


def signed_in_client():
    member = get_user_model().objects.create_user(email="image@example.test", password="safe-test-password")
    client = Client()
    client.force_login(member)
    return member, client


def image_model() -> CatalogModel:
    return CatalogModel.objects.create(
        id="acme/image-pro",
        name="Image Pro",
        provider="Acme",
        input_modalities=["text"],
        output_modalities=["image"],
        image_price_usd_per_generation="0.020000000000000",
    )


def test_catalog_and_quote_expose_an_available_image_model(db):
    _, client = signed_in_client()
    image_model()

    catalog = client.get("/api/v1/models?mode=image")
    quote = client.post(
        "/api/v1/runs/quote",
        data={"mode": "image", "modelId": "acme/image-pro", "text": "Неоновый город под дождём"},
        content_type="application/json",
    )

    assert catalog.status_code == 200
    assert catalog.json()["data"][0]["supportedModes"] == ["image"]
    assert catalog.json()["data"][0]["priceHintMicro"] == 20_000
    assert quote.status_code == 200
    assert quote.json()["data"]["resolvedModel"] == "acme/image-pro"
    assert quote.json()["data"]["estimatedCostMicro"] == 20_000


@override_settings(OPENROUTER_API_KEY="test-key")
@patch("runs.worker.generate_openrouter_image")
def test_image_run_persists_a_private_generated_asset_and_settles_actual_cost(generate, db):
    member, client = signed_in_client()
    image_model()
    grant_credits(member, 50_000, correlation_id="image-grant")
    chat = Chat.objects.create(owner=member, title="Image chat")
    quote = client.post(
        "/api/v1/runs/quote",
        data={"mode": "image", "modelId": "acme/image-pro", "text": "Неоновый город под дождём"},
        content_type="application/json",
    ).json()["data"]
    created = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": quote["quoteId"], "mode": "image", "modelId": "acme/image-pro", "text": "Неоновый город под дождём"},
        content_type="application/json",
        headers={"Idempotency-Key": "image-run"},
    ).json()["data"]
    generate.return_value = ImageGeneration(
        data=b"\x89PNG\r\n\x1a\nexample-image",
        content_type="image/png",
        model_id="acme/image-pro-v2",
        cost_usd=Decimal("0.010"),
        provider_request_id="img-1",
    )
    process_run(created["runId"])

    run = Run.objects.select_related("output_message", "hold").get(id=created["runId"])
    part = run.output_message.parts[0]
    assert run.status == Run.Status.COMPLETED
    assert part["type"] == "image"
    assert part["url"].startswith("/api/v1/media/")
    assert run.output_message.text == "Изображение готово."
    assert run.attempts.get().resolved_model == "acme/image-pro-v2"
    assert run.hold.consumed_at is not None
    assert available_balance_micro(member.credit_account) == 40_000
    assert [event.type for event in run.events.all()] == ["queued", "routed", "media", "done"]

    generated_id = part["assetId"]
    library = client.get("/api/v1/media")
    assert library.status_code == 200
    assert library.json()["data"][0]["id"] == generated_id
    assert library.json()["data"][0]["chatId"] == str(chat.id)
    download = client.get(f"/api/v1/media/{generated_id}/download")
    assert download.status_code == 200
    assert download["Cache-Control"] == "private, no-store"
    other = Client()
    other.force_login(get_user_model().objects.create_user(email="other-image@example.test", password="safe-test-password"))
    assert other.get(f"/api/v1/media/{generated_id}/download").status_code == 404
    GeneratedAsset.objects.get(id=generated_id).file.delete(save=False)


def test_image_run_without_a_provider_key_releases_its_hold(db):
    member, client = signed_in_client()
    image_model()
    grant_credits(member, 50_000, correlation_id="image-no-key")
    chat = Chat.objects.create(owner=member, title="Image chat")
    quote = client.post(
        "/api/v1/runs/quote",
        data={"mode": "image", "modelId": "acme/image-pro", "text": "Неоновый город под дождём"},
        content_type="application/json",
    ).json()["data"]
    created = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": quote["quoteId"], "mode": "image", "modelId": "acme/image-pro", "text": "Неоновый город под дождём"},
        content_type="application/json",
        headers={"Idempotency-Key": "image-no-key"},
    ).json()["data"]

    process_run(created["runId"])

    run = Run.objects.select_related("hold").get(id=created["runId"])
    assert run.status == Run.Status.FAILED
    assert run.hold.released_at is not None
    assert run.output_message.parts[0]["status"] == "failed"
    assert available_balance_micro(member.credit_account) == 50_000
    assert run.events.last().payload["code"] == "provider_unavailable"
