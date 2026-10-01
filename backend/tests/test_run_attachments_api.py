from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client

from files.models import FileAsset
from ledger.services import grant_credits
from runs.worker import process_run
from workspace.models import Chat


def client_for(email: str):
    user = get_user_model().objects.create_user(email=email, password="safe-test-password")
    client = Client()
    client.force_login(user)
    return user, client


def make_text_file(owner, name="brief.txt", content=b"Market brief"):
    return FileAsset.objects.create(
        owner=owner,
        file=SimpleUploadedFile(name, content, content_type="text/plain"),
        original_name=name,
        content_type="text/plain",
        size_bytes=len(content),
        sha256="a" * 64,
    )


def test_quote_and_run_bind_owned_file_assets_to_message_and_run(db, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    user, client = client_for("files-run@example.test")
    grant_credits(user, 100_000, correlation_id="files-run")
    chat = Chat.objects.create(owner=user, title="Files")
    asset = make_text_file(user)

    quote = client.post(
        "/api/v1/runs/quote",
        data={"mode": "text", "text": "Собери план", "attachmentIds": [str(asset.id)]},
        content_type="application/json",
    )
    payload = quote.json()["data"]
    started = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": payload["quoteId"], "mode": "text", "text": "Собери план", "attachmentIds": [str(asset.id)]},
        content_type="application/json",
        headers={"Idempotency-Key": "file-run"},
    )

    assert quote.status_code == 200
    assert started.status_code == 201
    run = chat.runs.get(id=started.json()["data"]["runId"])
    assert run.attachments.get().file_id == asset.id
    assert run.input_message.parts[1]["fileId"] == str(asset.id)


def test_local_run_uses_text_attachment_as_bounded_context(db, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    user, client = client_for("context-files@example.test")
    grant_credits(user, 100_000, correlation_id="context-files")
    chat = Chat.objects.create(owner=user, title="Files")
    asset = make_text_file(user, content=b"The market grows 20 percent.")
    quote = client.post("/api/v1/runs/quote", data={"mode": "text", "text": "Summarize", "attachmentIds": [str(asset.id)]}, content_type="application/json").json()["data"]
    started = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": quote["quoteId"], "mode": "text", "text": "Summarize", "attachmentIds": [str(asset.id)]},
        content_type="application/json",
        headers={"Idempotency-Key": "context-file-run"},
    ).json()["data"]

    process_run(started["runId"])

    assert "The market grows 20 percent." in chat.runs.get(id=started["runId"]).output_message.text


def test_foreign_or_changed_attachment_ids_cannot_be_dispatched(db, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    user, client = client_for("owner-files@example.test")
    outsider, _ = client_for("outsider-files@example.test")
    grant_credits(user, 100_000, correlation_id="owner-files")
    chat = Chat.objects.create(owner=user, title="Files")
    foreign = make_text_file(outsider)

    denied = client.post(
        "/api/v1/runs/quote",
        data={"mode": "text", "text": "Собери план", "attachmentIds": [str(foreign.id)]},
        content_type="application/json",
    )
    clean_quote = client.post("/api/v1/runs/quote", data={"mode": "text", "text": "Собери план"}, content_type="application/json").json()["data"]
    changed = client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": clean_quote["quoteId"], "mode": "text", "text": "Собери план", "attachmentIds": [str(foreign.id)]},
        content_type="application/json",
        headers={"Idempotency-Key": "foreign-file-run"},
    )

    assert denied.status_code == 422
    assert denied.json()["error"]["code"] == "attachment_unavailable"
    assert changed.status_code == 409
    assert changed.json()["error"]["code"] == "quote_expired"
