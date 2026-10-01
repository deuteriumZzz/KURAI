from django.contrib.auth import get_user_model
from django.test import Client, override_settings

from workspace.models import Chat, Message


def signed_in_client(email: str):
    user = get_user_model().objects.create_user(email=email, password="safe-password-2026")
    client = Client()
    client.force_login(user)
    return user, client


def test_owner_can_create_public_readonly_link_and_revoke_it(db):
    owner, client = signed_in_client("owner@example.test")
    chat = Chat.objects.create(owner=owner, title="Стратегия запуска")
    Message.objects.create(chat=chat, role=Message.Role.USER, text="Собери стратегию", parts=[{"type": "text", "text": "Собери стратегию"}])

    created = client.post(f"/api/v1/chats/{chat.id}/share-links", data={"expiresInHours": 24}, content_type="application/json")
    token = created.json()["data"]["token"]
    listed = client.get(f"/api/v1/chats/{chat.id}/share-links")
    Message.objects.create(chat=chat, role=Message.Role.ASSISTANT, text="Не должно попасть в ссылку", parts=[{"type": "text", "text": "Не должно попасть в ссылку"}])
    shared = Client().get(f"/api/v1/shares/{token}")
    revoked = client.post(f"/api/v1/share-links/{created.json()['data']['id']}/revoke")
    unavailable = Client().get(f"/api/v1/shares/{token}")

    assert created.status_code == 201
    assert listed.status_code == 200
    assert listed.json()["data"][0]["id"] == created.json()["data"]["id"]
    assert listed.json()["data"][0]["token"] == token
    assert len(token) >= 32
    assert shared.status_code == 200
    assert shared.json()["data"] == {
        "chat": {"title": "Стратегия запуска"},
        "messages": [{"role": "user", "model": None, "text": "Собери стратегию"}],
    }
    assert revoked.status_code == 200
    assert unavailable.status_code == 404


def test_foreign_member_cannot_create_or_revoke_another_members_share_link(db):
    owner, owner_client = signed_in_client("owner@example.test")
    _, outsider = signed_in_client("outsider@example.test")
    chat = Chat.objects.create(owner=owner, title="Приватный чат")
    created = owner_client.post(f"/api/v1/chats/{chat.id}/share-links", data={}, content_type="application/json")

    denied_create = outsider.post(f"/api/v1/chats/{chat.id}/share-links", data={}, content_type="application/json")
    denied_revoke = outsider.post(f"/api/v1/share-links/{created.json()['data']['id']}/revoke")

    assert denied_create.status_code == 404
    assert denied_revoke.status_code == 404


def test_replacing_a_chat_share_link_revokes_the_previous_token(db):
    owner, client = signed_in_client("replace-link@example.test")
    chat = Chat.objects.create(owner=owner, title="Заметки")
    first = client.post(f"/api/v1/chats/{chat.id}/share-links", data={}, content_type="application/json")
    second = client.post(f"/api/v1/chats/{chat.id}/share-links", data={}, content_type="application/json")
    listed = client.get(f"/api/v1/chats/{chat.id}/share-links")

    assert first.status_code == 201
    assert second.status_code == 201
    assert Client().get(f"/api/v1/shares/{first.json()['data']['token']}").status_code == 404
    assert listed.json()["data"] == [second.json()["data"]]


def test_public_snapshot_omits_private_message_parts_and_internal_identifiers(db):
    owner, client = signed_in_client("safe-snapshot@example.test")
    chat = Chat.objects.create(owner=owner, title="Закрытая заметка")
    Message.objects.create(
        chat=chat,
        role=Message.Role.ASSISTANT,
        resolved_model="provider/private-model",
        parts=[
            {"type": "text", "text": "Разрешённый результат"},
            {"type": "file", "fileId": "internal-file", "name": "private.pdf", "mime": "application/pdf"},
            {"type": "image", "assetId": "internal-asset", "url": "/api/v1/media/internal", "alt": "private"},
        ],
    )
    token = client.post(f"/api/v1/chats/{chat.id}/share-links", data={}, content_type="application/json").json()["data"]["token"]

    payload = Client().get(f"/api/v1/shares/{token}").json()["data"]

    assert payload == {
        "chat": {"title": "Закрытая заметка"},
        "messages": [{"role": "assistant", "model": "provider/private-model", "text": "Разрешённый результат"}],
    }


@override_settings(REST_FRAMEWORK={"DEFAULT_THROTTLE_RATES": {"share_read": "1/minute"}})
def test_public_share_read_is_rate_limited_per_anonymous_client(db):
    owner, client = signed_in_client("throttle-share@example.test")
    chat = Chat.objects.create(owner=owner, title="Ограничение")
    token = client.post(f"/api/v1/chats/{chat.id}/share-links", data={}, content_type="application/json").json()["data"]["token"]
    viewer = Client(REMOTE_ADDR="203.0.113.201")

    first = viewer.get(f"/api/v1/shares/{token}")
    limited = viewer.get(f"/api/v1/shares/{token}")

    assert first.status_code == 200
    assert limited.status_code == 429
