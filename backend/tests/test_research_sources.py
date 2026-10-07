from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import Client
from django.test.utils import override_settings

from ledger.services import grant_credits
from model_catalog.models import CatalogModel
from runs.models import Run, RunEvent, RunSource
from runs.providers.openrouter import CompletionChunk, ResearchCitation
from runs.services import estimate_cost_micro
from runs.worker import process_run
from workspace.models import Chat


def signed_in_client():
    member = get_user_model().objects.create_user(email="research@example.test", password="safe-test-password")
    client = Client()
    client.force_login(member)
    return member, client


def create_research_run(client, member):
    model = CatalogModel.objects.create(
        id="acme/research",
        name="Research model",
        provider="Acme",
        input_modalities=["text"],
        output_modalities=["text"],
        prompt_price_usd_per_token="0.000001000000000",
        completion_price_usd_per_token="0.000002000000000",
    )
    grant_credits(member, 100_000, correlation_id="research-grant")
    chat = Chat.objects.create(owner=member, title="Research chat")
    quote = client.post(
        "/api/v1/runs/quote",
        data={"mode": "research", "modelId": model.id, "text": "Что изменилось в индустрии?"},
        content_type="application/json",
    ).json()["data"]
    payload = client.post(
        "/api/v1/runs",
        data={
            "chatId": str(chat.id), "quoteId": quote["quoteId"], "mode": "research", "modelId": model.id,
            "text": "Что изменилось в индустрии?",
        },
        content_type="application/json",
        headers={"Idempotency-Key": "research-run"},
    ).json()["data"]
    return chat, payload


@override_settings(OPENROUTER_API_KEY="test-key")
@patch("runs.worker.stream_openrouter_completion")
def test_research_persists_sanitised_citations_and_replays_them_to_the_chat(stream, db):
    member, client = signed_in_client()
    chat, created = create_research_run(client, member)
    stream.return_value = iter(
        [
            CompletionChunk(
                text="Ключевой вывод подтверждён источником [1].",
                citations=(
                    ResearchCitation(
                        url="https://example.com/report?utm_source=provider",
                        title="Independent report",
                        excerpt="A provider excerpt that is retained for audit, but never rendered as HTML.",
                    ),
                    ResearchCitation(url="javascript:alert(1)", title="unsafe", excerpt="must be rejected"),
                ),
            ),
            CompletionChunk(model_id="acme/research-v2", provider_request_id="req-1", cost_usd=Decimal("0.001")),
        ]
    )

    process_run(created["runId"])

    run = Run.objects.select_related("output_message").get(id=created["runId"])
    source = RunSource.objects.get(run=run)
    source_part = next(part for part in run.output_message.parts if part["type"] == "sources")
    assert source.url == "https://example.com/report?utm_source=provider"
    expected = {"url": source.url, "title": "Independent report", "quote": "A provider excerpt that is retained for audit, but never rendered as HTML.", "readAt": source.created_at.isoformat()}
    assert source_part["items"] == [expected]
    assert list(RunEvent.objects.filter(run=run, type=RunEvent.Type.SOURCE).values_list("payload", flat=True)) == [expected]

    snapshot = client.get(f"/api/v1/chats/{chat.id}").json()["data"]
    answer = next(message for message in snapshot["messages"] if message["id"] == str(run.output_message_id))
    assert next(part for part in answer["parts"] if part["type"] == "sources")["items"] == source_part["items"]


@override_settings(
    KURAI_CREDITS_PER_USD=1_000_000,
    KURAI_RESEARCH_MAX_USES=2,
    KURAI_RESEARCH_SEARCH_COST_USD_PER_USE=Decimal("0.007"),
)
def test_research_quote_reserves_the_bounded_search_budget(db):
    model = CatalogModel.objects.create(
        id="acme/priced-research",
        name="Priced research",
        provider="Acme",
        input_modalities=["text"],
        output_modalities=["text"],
        prompt_price_usd_per_token="0.000001000000000",
        completion_price_usd_per_token="0.000002000000000",
    )

    text_quote = estimate_cost_micro(model=model, text="проверить свежие факты", mode="text")
    research_quote = estimate_cost_micro(model=model, text="проверить свежие факты", mode="research")

    assert research_quote - text_quote == 14_000
