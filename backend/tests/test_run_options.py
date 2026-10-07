from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.test.utils import override_settings

from ledger.services import grant_credits
from media.models import GeneratedAsset
from model_catalog.models import CatalogModel
from runs.models import Quote, Run
from runs.options import RunOptionsError, normalize_options, prompt_directives
from runs.providers.openrouter import CompletionChunk, ImageGeneration
from runs.worker import process_run
from workspace.models import Chat, Project


def signed_in_client(email: str = "options@example.test"):
    member = get_user_model().objects.create_user(email=email, password="safe-test-password")
    client = Client()
    client.force_login(member)
    return member, client


def text_model() -> CatalogModel:
    return CatalogModel.objects.create(
        id="acme/think", name="Think", provider="Acme", input_modalities=["text"], output_modalities=["text"],
        prompt_price_usd_per_token="0.000001", completion_price_usd_per_token="0.000002",
    )


def quote(client: Client, *, mode: str, model_id: str, text: str, options: dict | None = None):
    body = {"mode": mode, "modelId": model_id, "text": text}
    if options is not None:
        body["options"] = options
    return client.post("/api/v1/runs/quote", data=body, content_type="application/json")


def test_options_are_normalized_with_defaults_and_reject_anything_unknown():
    assert normalize_options("text", None) == {"web": False, "think": False}
    assert normalize_options("image", {"count": 4, "style": "neon"}) == {"count": 4, "aspect": "1:1", "style": "neon"}
    with pytest.raises(RunOptionsError):
        normalize_options("text", {"temperature": 2})
    with pytest.raises(RunOptionsError):
        normalize_options("image", {"count": 3})
    with pytest.raises(RunOptionsError):
        normalize_options("text", {"web": "yes"})
    with pytest.raises(RunOptionsError):
        normalize_options("image", {"count": True})
    assert prompt_directives("image", {"count": 1, "aspect": "4:5", "style": "cinema"}) == "Формат кадра 4:5. Стиль: кинематографичный."
    assert prompt_directives("image", {"count": 1, "aspect": "1:1", "style": "none"}) == ""


def test_quote_prices_reasoning_web_and_image_count_and_rejects_invalid_options(db):
    _, client = signed_in_client()
    text_model()
    CatalogModel.objects.create(
        id="acme/image", name="Image", provider="Acme", input_modalities=["text"], output_modalities=["image"],
        image_price_usd_per_generation="0.020000000000000",
    )
    plain = quote(client, mode="text", model_id="acme/think", text="план").json()["data"]["estimatedCostMicro"]
    think = quote(client, mode="text", model_id="acme/think", text="план", options={"think": True}).json()["data"]["estimatedCostMicro"]
    web = quote(client, mode="text", model_id="acme/think", text="план", options={"web": True}).json()["data"]["estimatedCostMicro"]
    one = quote(client, mode="image", model_id="acme/image", text="город").json()["data"]["estimatedCostMicro"]
    four = quote(client, mode="image", model_id="acme/image", text="город", options={"count": 4}).json()["data"]
    invalid = quote(client, mode="text", model_id="acme/think", text="текст", options={"speed": 1.2})

    assert think > plain
    assert web > plain
    assert four["estimatedCostMicro"] == one * 4
    assert four["options"] == {"count": 4, "aspect": "1:1", "style": "none"}
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "invalid_options"


def test_variable_priced_router_reserves_the_ceiling_not_the_minimum(db):
    _, client = signed_in_client()
    # the catalog sync stores OpenRouter's variable router price as -1
    CatalogModel.objects.filter(id="openrouter/auto").update(prompt_price_usd_per_token="-1", completion_price_usd_per_token="-1", is_router=False)
    quoted = quote(client, mode="text", model_id="openrouter/auto", text="план").json()["data"]
    # 1 prompt token × $0.000005 + 1024 completion tokens × $0.000025 → 25 605 micro, far above the 1 000 minimum
    assert quoted["estimatedCostMicro"] == 25_605


def test_estimate_matches_the_quote_reserve_without_storing_a_quote(db):
    _, client = signed_in_client()
    text_model()
    options = {"web": True, "think": True}
    estimate = client.post(
        "/api/v1/runs/estimate", data={"mode": "text", "modelId": "acme/think", "chars": 4, "options": options}, content_type="application/json",
    )
    assert Quote.objects.count() == 0
    quoted = quote(client, mode="text", model_id="acme/think", text="план", options=options).json()["data"]
    assert estimate.status_code == 200
    assert estimate.json()["data"]["estimatedCostMicro"] == quoted["estimatedCostMicro"]
    # the cells are the same formula: input, output ceiling and the search cap, each rounded up
    parts = estimate.json()["data"]["parts"]
    assert set(parts) == {"input", "output", "think", "search"}
    assert 0 <= sum(parts.values()) - quoted["estimatedCostMicro"] <= len(parts)
    assert client.post("/api/v1/runs/estimate", data={"mode": "text", "modelId": "acme/think", "options": {"speed": 2}}, content_type="application/json").status_code == 422


def test_run_must_carry_the_same_options_it_was_quoted_with(db):
    member, client = signed_in_client()
    text_model()
    grant_credits(member, 100_000, correlation_id="options-grant")
    chat = Chat.objects.create(owner=member, title="Опции")
    quoted = quote(client, mode="text", model_id="acme/think", text="план", options={"think": True}).json()["data"]
    swapped = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": quoted["quoteId"], "mode": "text", "modelId": "acme/think", "text": "план", "options": {"think": False}},
        content_type="application/json",
        headers={"Idempotency-Key": "options-swapped"},
    )
    assert swapped.status_code == 409
    assert swapped.json()["error"]["code"] == "quote_expired"


@override_settings(OPENROUTER_API_KEY="test-key")
@patch("runs.worker.stream_openrouter_completion")
def test_worker_sends_reasoning_and_web_search_to_the_provider(stream, db):
    member, client = signed_in_client()
    text_model()
    grant_credits(member, 100_000, correlation_id="options-stream-grant")
    chat = Chat.objects.create(owner=member, title="Опции")
    options = {"web": True, "think": True}
    quoted = quote(client, mode="text", model_id="acme/think", text="план", options=options).json()["data"]
    created = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": quoted["quoteId"], "mode": "text", "modelId": "acme/think", "text": "план", "options": options},
        content_type="application/json",
        headers={"Idempotency-Key": "options-stream"},
    ).json()["data"]
    stream.return_value = iter([CompletionChunk(text="Готово.", model_id="acme/think")])

    process_run(created["runId"])

    kwargs = stream.call_args.kwargs
    assert kwargs["reasoning"] is True
    assert kwargs["research"] is True
    assert kwargs["search_uses"] >= 1
    assert kwargs["max_tokens"] > 1024
    assert Run.objects.get(id=created["runId"]).status == Run.Status.COMPLETED


@override_settings(OPENROUTER_API_KEY="test-key")
@patch("runs.worker.generate_openrouter_image")
def test_image_count_generates_and_stores_every_image(generate, db):
    member, client = signed_in_client()
    CatalogModel.objects.create(
        id="acme/image", name="Image", provider="Acme", input_modalities=["text"], output_modalities=["image"],
        image_price_usd_per_generation="0.020000000000000",
    )
    grant_credits(member, 200_000, correlation_id="options-image-grant")
    chat = Chat.objects.create(owner=member, title="Картинки")
    options = {"count": 2, "aspect": "4:5"}
    quoted = quote(client, mode="image", model_id="acme/image", text="город", options=options).json()["data"]
    created = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": quoted["quoteId"], "mode": "image", "modelId": "acme/image", "text": "город", "options": options},
        content_type="application/json",
        headers={"Idempotency-Key": "options-image"},
    ).json()["data"]
    generate.return_value = ImageGeneration(data=b"\x89PNG\r\n\x1a\nimg", content_type="image/png", model_id="acme/image", cost_usd=Decimal("0.010"), provider_request_id="img")

    process_run(created["runId"])

    run = Run.objects.select_related("output_message").get(id=created["runId"])
    assert generate.call_count == 2
    assert "Формат кадра 4:5." in generate.call_args.kwargs["prompt"]
    assert [part["type"] for part in run.output_message.parts] == ["image", "image"]
    assert GeneratedAsset.objects.filter(run=run).count() == 2
    assert run.attempts.get().billed_cost_micro == 20_000


def test_chat_can_be_renamed_pinned_archived_and_restored(db):
    member, client = signed_in_client()
    chat = Chat.objects.create(owner=member, title="Черновик")
    url = f"/api/v1/chats/{chat.id}"

    renamed = client.patch(url, data={"title": "План запуска", "pinned": True}, content_type="application/json")
    archived = client.patch(url, data={"archived": True}, content_type="application/json")
    listed = client.get("/api/v1/chats").json()["data"]
    restored = client.patch(url, data={"archived": False}, content_type="application/json")
    empty = client.patch(url, data={}, content_type="application/json")

    assert renamed.status_code == 200
    assert renamed.json()["data"]["title"] == "План запуска"
    assert renamed.json()["data"]["pinned"] is True
    assert archived.status_code == 200
    assert all(item["id"] != str(chat.id) for item in listed)
    assert restored.status_code == 200
    assert any(item["id"] == str(chat.id) for item in client.get("/api/v1/chats").json()["data"])
    assert empty.status_code == 422


def test_archived_chat_refuses_new_runs_and_closes_its_share_link(db):
    member, client = signed_in_client()
    text_model()
    grant_credits(member, 100_000, correlation_id="archive-grant")
    chat = Chat.objects.create(owner=member, title="Архив")
    link = client.post(f"/api/v1/chats/{chat.id}/share-links", data={}, content_type="application/json").json()["data"]
    client.patch(f"/api/v1/chats/{chat.id}", data={"archived": True}, content_type="application/json")
    quoted = quote(client, mode="text", model_id="acme/think", text="план").json()["data"]

    run = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": quoted["quoteId"], "mode": "text", "modelId": "acme/think", "text": "план"},
        content_type="application/json",
        headers={"Idempotency-Key": "archived-run"},
    )

    assert run.status_code == 404
    assert Client().get(f"/api/v1/shares/{link['token']}").status_code == 404


def test_foreign_member_cannot_change_another_members_chat(db):
    owner, _ = signed_in_client("chat-owner@example.test")
    _, outsider = signed_in_client("chat-outsider@example.test")
    chat = Chat.objects.create(owner=owner, title="Чужой")
    denied = outsider.patch(f"/api/v1/chats/{chat.id}", data={"archived": True}, content_type="application/json")
    chat.refresh_from_db()
    assert denied.status_code == 404
    assert chat.archived_at is None


def test_chat_moves_into_an_owned_project_and_back_out(db):
    from workspace.models import Project
    member, client = signed_in_client("mover@example.test")
    other, _ = signed_in_client("other-owner@example.test")
    chat = Chat.objects.create(owner=member, title="Бриф")
    mine = Project.objects.create(owner=member, name="Запуск")
    foreign = Project.objects.create(owner=other, name="Чужой")
    url = f"/api/v1/chats/{chat.id}"

    moved = client.patch(url, data={"projectId": str(mine.id)}, content_type="application/json")
    refused = client.patch(url, data={"projectId": str(foreign.id)}, content_type="application/json")
    out = client.patch(url, data={"projectId": None}, content_type="application/json")

    assert moved.status_code == 200 and moved.json()["data"]["projectId"] == str(mine.id)
    assert refused.status_code == 404
    assert out.status_code == 200 and out.json()["data"]["projectId"] is None


@override_settings(OPENROUTER_API_KEY="test-key")
@patch("runs.worker.stream_openrouter_completion")
def test_project_instructions_reach_the_model_as_a_system_message(stream, db):
    member, client = signed_in_client()
    other, other_client = signed_in_client("instructions-other@example.test")
    text_model()
    grant_credits(member, 100_000, correlation_id="instructions-grant")
    project = Project.objects.create(owner=member, name="Запуск")
    saved = client.patch(f"/api/v1/projects/{project.id}", data={"instructions": "  Отвечай кратко, по-русски.  "}, content_type="application/json")
    assert saved.status_code == 200
    assert saved.json()["data"]["instructions"] == "Отвечай кратко, по-русски."
    assert other_client.patch(f"/api/v1/projects/{project.id}", data={"instructions": "чужое"}, content_type="application/json").status_code == 404
    chat = Chat.objects.create(owner=member, title="В проекте", project=project)
    listed = client.get("/api/v1/chats").json()["data"]
    assert listed[0]["updatedAt"]
    quoted = quote(client, mode="text", model_id="acme/think", text="план").json()["data"]
    created = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": quoted["quoteId"], "mode": "text", "modelId": "acme/think", "text": "план"},
        content_type="application/json",
        headers={"Idempotency-Key": "instructions-run"},
    ).json()["data"]
    stream.return_value = iter([CompletionChunk(text="Готово.", model_id="acme/think")])

    process_run(created["runId"])

    assert stream.call_args.kwargs["system"] == "Отвечай кратко, по-русски."
    assert stream.call_args.kwargs["prompt"].startswith("план")
    # the charge in the ledger names its model and links back to the chat
    charge = next(e for e in client.get("/api/v1/ledger").json()["data"]["entries"] if e["kind"] == "charge")
    assert charge["chatId"] == str(chat.id)
    assert charge["model"] == "acme/think"
    assert charge["mode"] == "text"
