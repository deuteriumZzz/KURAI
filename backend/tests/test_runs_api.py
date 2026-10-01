from django.contrib.auth import get_user_model
from django.test import Client
from django.test.utils import override_settings
from unittest.mock import patch
from decimal import Decimal

from ledger.services import available_balance_micro, grant_credits
from runs.models import CompareRun, Run, RunEvent
from runs.worker import finalize_cancellation, process_run, start_run
from runs.providers.openrouter import CompletionChunk
from model_catalog.models import CatalogModel
from workspace.models import Chat, Message


def signed_in_client(email: str = "dmitry@example.test"):
    member = get_user_model().objects.create_user(email=email, password="safe-test-password")
    client = Client()
    client.force_login(member)
    return member, client


def quote(client: Client, text: str = "Собери план запуска"):
    return client.post(
        "/api/v1/runs/quote",
        data={"mode": "text", "text": text},
        content_type="application/json",
    ).json()["data"]


def quoted_catalog_model(client: Client, model_id: str, prompt: str):
    CatalogModel.objects.create(
        id=model_id,
        name=model_id.rsplit("/", 1)[-1],
        provider="Acme",
        input_modalities=["text"],
        output_modalities=["text"],
        prompt_price_usd_per_token="0.000001",
        completion_price_usd_per_token="0.000002",
    )
    response = client.post(
        "/api/v1/runs/quote",
        data={"mode": "text", "modelId": model_id, "text": prompt},
        content_type="application/json",
    )
    assert response.status_code == 200
    return response.json()["data"]


def test_compare_run_creates_one_prompt_and_bounded_sibling_results_atomically(db):
    member, client = signed_in_client("compare@example.test")
    grant_credits(member, 100_000, correlation_id="compare-grant")
    chat = Chat.objects.create(owner=member, title="Сравнение")
    prompt = "Собери план запуска"
    first = quoted_catalog_model(client, "acme/precise", prompt)
    second = quoted_catalog_model(client, "acme/fast", prompt)
    payload = {
        "chatId": str(chat.id),
        "mode": "text",
        "text": prompt,
        "routes": [
            {"modelId": "acme/precise", "quoteId": first["quoteId"]},
            {"modelId": "acme/fast", "quoteId": second["quoteId"]},
        ],
    }

    created = client.post("/api/v1/runs/compare", data=payload, content_type="application/json", headers={"Idempotency-Key": "compare-run-1"})
    replay = client.post("/api/v1/runs/compare", data=payload, content_type="application/json", headers={"Idempotency-Key": "compare-run-1"})

    assert created.status_code == replay.status_code == 201
    body = created.json()["data"]
    assert body["compareId"] == replay.json()["data"]["compareId"]
    assert [item["estimatedCostMicro"] for item in body["runs"]] == [first["estimatedCostMicro"], second["estimatedCostMicro"]]
    assert body["estimatedTotalCostMicro"] == first["estimatedCostMicro"] + second["estimatedCostMicro"]
    group = CompareRun.objects.get(id=body["compareId"])
    runs = list(group.runs.order_by("comparison_position").select_related("output_message"))
    assert len(runs) == 2
    assert Message.objects.filter(chat=chat).count() == 3
    assert {run.output_message.parent_id for run in runs} == {group.input_message_id}
    assert [run.quote.resolved_model for run in runs] == ["acme/precise", "acme/fast"]
    assert available_balance_micro(member.credit_account) == 100_000 - body["estimatedTotalCostMicro"]


def test_compare_run_rejects_duplicate_or_unfunded_routes_without_creating_a_partial_prompt(db):
    member, client = signed_in_client("compare-insufficient@example.test")
    chat = Chat.objects.create(owner=member, title="Сравнение")
    prompt = "Собери план запуска"
    first = quoted_catalog_model(client, "acme/one", prompt)
    second = quoted_catalog_model(client, "acme/two", prompt)
    payload = {
        "chatId": str(chat.id),
        "mode": "text",
        "text": prompt,
        "routes": [
            {"modelId": "acme/one", "quoteId": first["quoteId"]},
            {"modelId": "acme/two", "quoteId": second["quoteId"]},
        ],
    }

    unfunded = client.post("/api/v1/runs/compare", data=payload, content_type="application/json", headers={"Idempotency-Key": "compare-unfunded"})

    assert unfunded.status_code == 409
    assert unfunded.json()["error"]["code"] == "insufficient_credits"
    assert CompareRun.objects.count() == Run.objects.count() == Message.objects.filter(chat=chat).count() == 0
    duplicate = client.post(
        "/api/v1/runs/compare",
        data={**payload, "routes": [payload["routes"][0], payload["routes"][0]]},
        content_type="application/json",
        headers={"Idempotency-Key": "compare-duplicate"},
    )
    assert duplicate.status_code == 422
    assert duplicate.json()["error"]["code"] == "validation_error"


def test_quote_is_persisted_and_owned_by_its_member(db):
    _, client = signed_in_client()

    response = client.post(
        "/api/v1/runs/quote",
        data={"mode": "text", "text": "Собери план запуска"},
        content_type="application/json",
    )

    assert response.status_code == 200
    assert response.json()["data"]["quoteId"]
    assert response.json()["data"]["estimatedCostMicro"] > 0


def test_run_rejects_missing_or_insufficient_credits(db):
    member, client = signed_in_client()
    chat = Chat.objects.create(owner=member, title="Новый диалог")
    run_quote = quote(client)

    response = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": run_quote["quoteId"], "mode": "text", "text": "Собери план запуска"},
        content_type="application/json",
        headers={"Idempotency-Key": "run-no-credit"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "insufficient_credits"
    assert Run.objects.count() == 0


def test_funded_run_creates_immutable_messages_hold_and_durable_event(db):
    member, client = signed_in_client()
    grant_credits(member, 50_000, correlation_id="test-grant")
    chat = Chat.objects.create(owner=member, title="Новый диалог")
    run_quote = quote(client)

    response = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": run_quote["quoteId"], "mode": "text", "text": "Собери план запуска"},
        content_type="application/json",
        headers={"Idempotency-Key": "run-funded"},
    )

    assert response.status_code == 201
    payload = response.json()["data"]
    run = Run.objects.get(id=payload["runId"])
    assert run.status == Run.Status.QUEUED
    assert payload["outputMessageId"] == str(run.output_message_id)
    assert run.hold.reserved_micro == run_quote["estimatedCostMicro"]
    assert RunEvent.objects.get(run=run, seq=1).type == RunEvent.Type.QUEUED
    assert Message.objects.filter(chat=chat).count() == 2


def test_same_idempotency_key_replays_without_a_second_hold_or_run(db):
    member, client = signed_in_client()
    grant_credits(member, 50_000, correlation_id="test-grant")
    chat = Chat.objects.create(owner=member, title="Новый диалог")
    run_quote = quote(client)
    request_data = {"chatId": str(chat.id), "quoteId": run_quote["quoteId"], "mode": "text", "text": "Собери план запуска"}

    first = client.post("/api/v1/runs", data=request_data, content_type="application/json", headers={"Idempotency-Key": "repeatable-run"})
    second = client.post("/api/v1/runs", data=request_data, content_type="application/json", headers={"Idempotency-Key": "repeatable-run"})

    assert first.status_code == second.status_code == 201
    assert first.json()["data"]["runId"] == second.json()["data"]["runId"]
    assert Run.objects.count() == 1


def test_run_can_branch_from_an_owned_message_and_rejects_a_foreign_parent(db):
    member, client = signed_in_client()
    other, _ = signed_in_client("branch-other@example.test")
    grant_credits(member, 100_000, correlation_id="branch-grant")
    chat = Chat.objects.create(owner=member, title="Ветки")
    parent = Message.objects.create(chat=chat, role=Message.Role.ASSISTANT, mode="text", parts=[{"type": "text", "text": "Черновик"}], text="Черновик")
    foreign_chat = Chat.objects.create(owner=other, title="Чужая ветка")
    foreign_parent = Message.objects.create(chat=foreign_chat, role=Message.Role.USER, mode="text", parts=[{"type": "text", "text": "Чужое"}], text="Чужое")
    quote = client.post("/api/v1/runs/quote", data={"mode": "text", "text": "Сделай короче"}, content_type="application/json").json()["data"]

    created = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": quote["quoteId"], "mode": "text", "text": "Сделай короче", "parentId": str(parent.id)},
        content_type="application/json",
        headers={"Idempotency-Key": "branch-run"},
    )
    created_run = Run.objects.select_related("input_message", "output_message").get(id=created.json()["data"]["runId"])

    assert created.status_code == 201
    assert created_run.input_message.parent_id == parent.id
    assert created_run.output_message.parent_id == created_run.input_message_id

    another_quote = client.post("/api/v1/runs/quote", data={"mode": "text", "text": "Чужая ветка"}, content_type="application/json").json()["data"]
    denied = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": another_quote["quoteId"], "mode": "text", "text": "Чужая ветка", "parentId": str(foreign_parent.id)},
        content_type="application/json",
        headers={"Idempotency-Key": "foreign-branch"},
    )
    assert denied.status_code == 404
    assert denied.json()["error"]["code"] == "not_found"


def test_same_idempotency_key_with_a_different_parent_is_a_conflict(db):
    member, client = signed_in_client()
    grant_credits(member, 100_000, correlation_id="branch-idempotency-grant")
    chat = Chat.objects.create(owner=member, title="Ветки")
    first_parent = Message.objects.create(chat=chat, role=Message.Role.USER, mode="text", parts=[{"type": "text", "text": "Первый"}], text="Первый")
    second_parent = Message.objects.create(chat=chat, role=Message.Role.USER, mode="text", parts=[{"type": "text", "text": "Второй"}], text="Второй")
    quote = client.post("/api/v1/runs/quote", data={"mode": "text", "text": "Ответ"}, content_type="application/json").json()["data"]
    payload = {"chatId": str(chat.id), "quoteId": quote["quoteId"], "mode": "text", "text": "Ответ", "parentId": str(first_parent.id)}

    first = client.post("/api/v1/runs", data=payload, content_type="application/json", headers={"Idempotency-Key": "branch-key"})
    conflict = client.post(
        "/api/v1/runs",
        data={**payload, "parentId": str(second_parent.id)},
        content_type="application/json",
        headers={"Idempotency-Key": "branch-key"},
    )

    assert first.status_code == 201
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "idempotency_conflict"


@override_settings(KURAI_SSE_MAX_SECONDS=0)
def test_owner_can_replay_durable_events_after_a_known_sequence(db):
    member, client = signed_in_client()
    grant_credits(member, 50_000, correlation_id="test-grant")
    chat = Chat.objects.create(owner=member, title="Новый диалог")
    run_quote = quote(client)
    created = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": run_quote["quoteId"], "mode": "text", "text": "Собери план запуска"},
        content_type="application/json",
        headers={"Idempotency-Key": "stream-run"},
    ).json()["data"]
    run = Run.objects.get(id=created["runId"])
    RunEvent.objects.create(run=run, seq=2, type=RunEvent.Type.ROUTED, payload={"provider": "local"})

    response = client.get(f"/api/v1/runs/{run.id}/events", headers={"Last-Event-ID": "1"})
    stream = b"".join(response.streaming_content).decode("utf-8")

    assert response.status_code == 200
    assert response["Cache-Control"] == "no-cache"
    assert "id: 2" in stream
    assert "event: routed" in stream
    assert "id: 1" not in stream


def test_sse_closes_after_replaying_a_terminal_run(db):
    member, client = signed_in_client()
    grant_credits(member, 50_000, correlation_id="terminal-sse-grant")
    chat = Chat.objects.create(owner=member, title="Новый диалог")
    run_quote = quote(client)
    created = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": run_quote["quoteId"], "mode": "text", "text": "Собери план запуска"},
        content_type="application/json",
        headers={"Idempotency-Key": "terminal-sse"},
    ).json()["data"]
    process_run(created["runId"])

    response = client.get(f"/api/v1/runs/{created['runId']}/events")
    stream = b"".join(response.streaming_content).decode("utf-8")

    assert response.status_code == 200
    assert "event: done" in stream


def test_cancel_releases_active_hold_and_hides_foreign_run(db):
    member, client = signed_in_client()
    grant_credits(member, 50_000, correlation_id="test-grant")
    chat = Chat.objects.create(owner=member, title="Новый диалог")
    run_quote = quote(client)
    created = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": run_quote["quoteId"], "mode": "text", "text": "Собери план запуска"},
        content_type="application/json",
        headers={"Idempotency-Key": "cancel-run"},
    ).json()["data"]
    run = Run.objects.get(id=created["runId"])
    other_member, other_client = signed_in_client("other@example.test")

    denied = other_client.get(f"/api/v1/runs/{run.id}")
    cancelled = client.post(f"/api/v1/runs/{run.id}/cancel")
    run.refresh_from_db()

    assert denied.status_code == 404
    assert cancelled.status_code == 200
    assert run.status == Run.Status.CANCELED
    assert run.hold.released_at is not None
    assert available_balance_micro(member.credit_account) == 50_000


def test_cancel_of_a_running_run_waits_for_worker_confirmation_before_releasing_hold(db):
    member, client = signed_in_client()
    grant_credits(member, 50_000, correlation_id="cancel-running-grant")
    chat = Chat.objects.create(owner=member, title="Новый диалог")
    run_quote = quote(client)
    created = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": run_quote["quoteId"], "mode": "text", "text": "Собери план запуска"},
        content_type="application/json",
        headers={"Idempotency-Key": "cancel-running-run"},
    ).json()["data"]
    started = start_run(created["runId"])
    assert started is not None

    response = client.post(f"/api/v1/runs/{created['runId']}/cancel")
    pending = Run.objects.select_related("hold").get(id=created["runId"])

    assert response.status_code == 200
    assert response.json()["data"]["status"] == Run.Status.CANCEL_REQUESTED
    assert pending.hold.released_at is None
    assert pending.events.last().type == "cancel_requested"
    assert "Остановка" in pending.output_message.text

    finalize_cancellation(created["runId"], started[-1])
    canceled = Run.objects.select_related("hold").get(id=created["runId"])

    assert canceled.status == Run.Status.CANCELED
    assert canceled.hold.released_at is not None
    assert canceled.attempts.get().status == "canceled"
    assert "остановлена" in canceled.output_message.text
    assert available_balance_micro(member.credit_account) == 50_000


@override_settings(OPENROUTER_API_KEY="test-key")
@patch("runs.worker.stream_openrouter_completion")
def test_worker_stops_after_a_running_cancel_and_keeps_only_delivered_delta(stream, db):
    member, client = signed_in_client()
    grant_credits(member, 50_000, correlation_id="cancel-stream-grant")
    chat = Chat.objects.create(owner=member, title="Новый диалог")
    run_quote = quote(client)
    created = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": run_quote["quoteId"], "mode": "text", "text": "Собери план запуска"},
        content_type="application/json",
        headers={"Idempotency-Key": "cancel-stream-run"},
    ).json()["data"]

    def chunks():
        yield CompletionChunk(text="Первая часть. ", model_id="acme/stream", provider_request_id="stream-1")
        client.post(f"/api/v1/runs/{created['runId']}/cancel")
        yield CompletionChunk(text="Не должна сохраниться.")

    stream.return_value = chunks()
    process_run(created["runId"])

    run = Run.objects.select_related("output_message", "hold").get(id=created["runId"])
    assert run.status == Run.Status.CANCELED
    assert "Первая часть." in run.output_message.text
    assert "Не должна сохраниться." not in run.output_message.text
    assert run.hold.released_at is not None
    assert [event.type for event in run.events.all()] == ["queued", "routed", "delta", "cancel_requested", "canceled"]


def test_local_worker_completes_run_emits_events_and_settles_exact_hold(db):
    member, client = signed_in_client()
    grant_credits(member, 50_000, correlation_id="test-grant")
    chat = Chat.objects.create(owner=member, title="Новый диалог")
    run_quote = quote(client, "Собери план запуска продукта")
    created = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": run_quote["quoteId"], "mode": "text", "text": "Собери план запуска продукта"},
        content_type="application/json",
        headers={"Idempotency-Key": "complete-run"},
    ).json()["data"]

    process_run(created["runId"])
    run = Run.objects.select_related("output_message", "hold").get(id=created["runId"])

    assert run.status == Run.Status.COMPLETED
    assert run.output_message.text.startswith("Рабочий план")
    assert run.hold.consumed_at is not None
    assert [event.type for event in run.events.all()] == ["queued", "routed", "delta", "done"]
    assert available_balance_micro(member.credit_account) == 50_000 - run_quote["estimatedCostMicro"]


@override_settings(KURAI_LOCAL_EXECUTE_RUNS=True)
def test_explicit_local_mvp_mode_completes_run_before_chat_is_reloaded(db):
    member, client = signed_in_client()
    grant_credits(member, 50_000, correlation_id="test-grant")
    chat = Chat.objects.create(owner=member, title="Новый диалог")
    run_quote = quote(client)

    response = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": run_quote["quoteId"], "mode": "text", "text": "Собери план запуска"},
        content_type="application/json",
        headers={"Idempotency-Key": "mvp-local-run"},
    )

    assert response.status_code == 201
    assert response.json()["data"]["status"] == Run.Status.COMPLETED
    assert Run.objects.get(id=response.json()["data"]["runId"]).output_message.text


@override_settings(KURAI_QUEUE_RUNS=True)
@patch("runs.tasks.process_run_task.delay")
def test_queue_mode_dispatches_after_run_commit(dispatch, db):
    member, client = signed_in_client()
    grant_credits(member, 50_000, correlation_id="test-grant")
    chat = Chat.objects.create(owner=member, title="Новый диалог")
    run_quote = quote(client)

    response = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": run_quote["quoteId"], "mode": "text", "text": "Собери план запуска"},
        content_type="application/json",
        headers={"Idempotency-Key": "queued-run"},
    )

    assert response.status_code == 201
    assert Run.objects.get(id=response.json()["data"]["runId"]).status == Run.Status.QUEUED
    dispatch.assert_called_once_with(response.json()["data"]["runId"])


def test_worker_failure_releases_hold_and_leaves_terminal_audit_event(db):
    member, client = signed_in_client()
    grant_credits(member, 50_000, correlation_id="test-grant")
    chat = Chat.objects.create(owner=member, title="Новый диалог")
    run_quote = quote(client)
    created = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": run_quote["quoteId"], "mode": "text", "text": "Собери план запуска"},
        content_type="application/json",
        headers={"Idempotency-Key": "failed-run"},
    ).json()["data"]

    with patch("runs.worker.local_text_result", side_effect=RuntimeError("provider unavailable")):
        process_run(created["runId"])

    run = Run.objects.select_related("hold").get(id=created["runId"])
    assert run.status == Run.Status.FAILED
    assert run.hold.released_at is not None
    assert run.events.last().type == RunEvent.Type.ERROR
    assert available_balance_micro(member.credit_account) == 50_000


@override_settings(OPENROUTER_API_KEY="test-key")
@patch("runs.worker.stream_openrouter_completion")
def test_openrouter_worker_streams_durable_deltas_and_records_actual_model(stream, db):
    member, client = signed_in_client()
    grant_credits(member, 50_000, correlation_id="test-grant")
    chat = Chat.objects.create(owner=member, title="Новый диалог")
    run_quote = quote(client)
    created = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": run_quote["quoteId"], "mode": "text", "text": "Собери план запуска"},
        content_type="application/json",
        headers={"Idempotency-Key": "openrouter-run"},
    ).json()["data"]
    stream.return_value = iter(
        [
            CompletionChunk(text="Готовый ", model_id="anthropic/claude-sonnet-4.5", provider_request_id="gen-1"),
            CompletionChunk(text="план.", cost_usd=Decimal("0.001")),
        ]
    )

    process_run(created["runId"])

    run = Run.objects.select_related("output_message", "hold").get(id=created["runId"])
    assert run.status == Run.Status.COMPLETED
    assert run.output_message.text == "Готовый план."
    assert run.output_message.resolved_model == "anthropic/claude-sonnet-4.5"
    assert [event.type for event in run.events.all()] == ["queued", "routed", "delta", "delta", "done"]
    assert run.attempts.get().provider == "openrouter"
    assert run.attempts.get().provider_request_id == "gen-1"
