from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client


def signed_in_client(email: str):
    user = get_user_model().objects.create_user(email=email, password="safe-password-2026")
    client = Client()
    client.force_login(user)
    return user, client


def test_member_can_upload_list_and_download_their_text_attachment(db, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    _, client = signed_in_client("owner@example.test")
    uploaded = client.post("/api/v1/files", data={"file": SimpleUploadedFile("brief.txt", b"launch brief", content_type="text/plain")})
    file_id = uploaded.json()["data"]["id"]
    listed = client.get("/api/v1/files")
    download = client.get(f"/api/v1/files/{file_id}/download")

    assert uploaded.status_code == 201
    assert uploaded.json()["data"]["sha256"]
    assert [item["id"] for item in listed.json()["data"]] == [file_id]
    assert download.status_code == 200
    assert download["Cache-Control"] == "private, no-store"
    assert b"".join(download.streaming_content) == b"launch brief"


def test_file_endpoints_reject_disallowed_type_and_hide_foreign_assets(db, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    _, owner = signed_in_client("owner@example.test")
    _, outsider = signed_in_client("outsider@example.test")
    rejected = owner.post("/api/v1/files", data={"file": SimpleUploadedFile("payload.exe", b"bad", content_type="application/octet-stream")})
    uploaded = owner.post("/api/v1/files", data={"file": SimpleUploadedFile("brief.txt", b"ok", content_type="text/plain")})

    denied = outsider.get(f"/api/v1/files/{uploaded.json()['data']['id']}/download")

    assert rejected.status_code == 422
    assert rejected.json()["error"]["code"] == "validation_error"
    assert denied.status_code == 404


def test_file_upload_rejects_a_spoofed_content_type_before_persisting(db, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    _, client = signed_in_client("owner@example.test")

    response = client.post(
        "/api/v1/files",
        data={"file": SimpleUploadedFile("not-really-an-image.png", b"not an image", content_type="image/png")},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert response.json()["error"]["message"] == "Содержимое файла не соответствует заявленному типу."


def test_member_can_upload_a_png_only_when_its_signature_matches(db, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    _, client = signed_in_client("owner@example.test")
    png = b"\x89PNG\r\n\x1a\n" + b"KURAI"

    response = client.post("/api/v1/files", data={"file": SimpleUploadedFile("signal.png", png, content_type="image/png")})

    assert response.status_code == 201
    assert response.json()["data"]["contentType"] == "image/png"
