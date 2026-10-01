from django.contrib.auth import get_user_model
from django.test import Client
from django.test.utils import override_settings

from ledger.services import grant_credits
from workspace.models import Chat

def signed_in_client():
    member = get_user_model().objects.create_user(email="rate-limit@example.test", password="safe-test-password")
    client = Client()
    client.force_login(member)
    return client


@override_settings(KURAI_RUN_QUOTE_RATE_LIMIT_COUNT=1, KURAI_RUN_RATE_LIMIT_WINDOW_SECONDS=60)
def test_quote_rate_limit_is_scoped_to_the_authenticated_member(db):
    client = signed_in_client()

    first = client.post("/api/v1/runs/quote", data={"mode": "text", "text": "Первый запрос"}, content_type="application/json")
    second = client.post("/api/v1/runs/quote", data={"mode": "text", "text": "Второй запрос"}, content_type="application/json")

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json()["error"]["code"] == "rate_limited"
    assert second["Retry-After"] == "60"


@override_settings(KURAI_RUN_START_RATE_LIMIT_COUNT=1, KURAI_RUN_RATE_LIMIT_WINDOW_SECONDS=60)
def test_run_rate_limit_preserves_idempotent_replay_but_rejects_a_new_launch(db):
    member = get_user_model().objects.create_user(email="run-rate-limit@example.test", password="safe-test-password")
    client = Client()
    client.force_login(member)
    grant_credits(member, 100_000, correlation_id="rate-limit-grant")
    chat = Chat.objects.create(owner=member, title="Rate limit")

    first_quote = client.post("/api/v1/runs/quote", data={"mode": "text", "text": "Первый запрос"}, content_type="application/json").json()["data"]
    first_payload = {"chatId": str(chat.id), "quoteId": first_quote["quoteId"], "mode": "text", "text": "Первый запрос"}
    first = client.post("/api/v1/runs", data=first_payload, content_type="application/json", headers={"Idempotency-Key": "limited-run-1"})
    replay = client.post("/api/v1/runs", data=first_payload, content_type="application/json", headers={"Idempotency-Key": "limited-run-1"})
    second_quote = client.post("/api/v1/runs/quote", data={"mode": "text", "text": "Второй запрос"}, content_type="application/json").json()["data"]
    second = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": second_quote["quoteId"], "mode": "text", "text": "Второй запрос"},
        content_type="application/json",
        headers={"Idempotency-Key": "limited-run-2"},
    )

    assert first.status_code == replay.status_code == 201
    assert first.json()["data"]["runId"] == replay.json()["data"]["runId"]
    assert second.status_code == 429
