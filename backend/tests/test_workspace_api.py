from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone

from runs.models import Quote, Run, RunAttempt, RunSource
from workspace.models import Artifact, Chat, Message, Recipe


def create_member(email: str):
    return get_user_model().objects.create_user(email=email, password="safe-test-password")


def test_custom_member_identity_is_email_first(db):
    member = create_member("dmitry@example.test")

    assert str(member.id)
    assert member.email == "dmitry@example.test"
    assert not hasattr(member, "username")


def test_projects_require_authentication():
    response = Client().get("/api/v1/projects")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_required"


def test_member_can_create_and_list_only_their_projects(db):
    member = create_member("dmitry@example.test")
    other_member = create_member("other@example.test")
    client = Client()
    client.force_login(member)
    other_client = Client()
    other_client.force_login(other_member)

    created = client.post(
        "/api/v1/projects",
        data={"name": "Коммерческий запуск", "accent": "cyan"},
        content_type="application/json",
    )
    other_client.post(
        "/api/v1/projects",
        data={"name": "Чужой проект"},
        content_type="application/json",
    )
    listed = client.get("/api/v1/projects")

    assert created.status_code == 201
    assert created.json()["data"]["name"] == "Коммерческий запуск"
    assert created.json()["data"]["accent"] == "cyan"
    assert listed.status_code == 200
    assert [project["name"] for project in listed.json()["data"]] == ["Коммерческий запуск"]


def test_member_can_create_chat_inside_own_project_but_not_someone_elses(db):
    member = create_member("dmitry@example.test")
    other_member = create_member("other@example.test")
    client = Client()
    client.force_login(member)
    other_client = Client()
    other_client.force_login(other_member)
    project = client.post("/api/v1/projects", data={"name": "Product"}, content_type="application/json").json()["data"]

    created = client.post(
        "/api/v1/chats",
        data={"title": "Исследование рынка", "projectId": project["id"]},
        content_type="application/json",
    )
    denied = other_client.post(
        "/api/v1/chats",
        data={"title": "Попытка доступа", "projectId": project["id"]},
        content_type="application/json",
    )

    assert created.status_code == 201
    assert created.json()["data"]["projectId"] == project["id"]
    assert denied.status_code == 404
    assert denied.json()["error"]["code"] == "not_found"


def test_member_can_restore_only_their_chat_with_immutable_message_parts(db):
    member = create_member("dmitry@example.test")
    other_member = create_member("other@example.test")
    chat = Chat.objects.create(owner=member, title="Запуск")
    message = Message.objects.create(
        chat=chat,
        role=Message.Role.USER,
        parts=[{"type": "text", "text": "Собери план"}],
        text="Собери план",
    )
    client = Client()
    client.force_login(member)
    other_client = Client()
    other_client.force_login(other_member)

    response = client.get(f"/api/v1/chats/{chat.id}")
    denied = other_client.get(f"/api/v1/chats/{chat.id}")

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["chat"]["id"] == str(chat.id)
    assert payload["messages"] == [
        {
            "id": str(message.id),
            "chatId": str(chat.id),
            "parentId": None,
            "role": "user",
            "mode": "text",
            "model": None,
            "parts": [{"type": "text", "text": "Собери план"}],
            "costMicro": 0,
            "createdAt": message.created_at.isoformat(),
        }
    ]
    assert denied.status_code == 404


def test_chat_restore_includes_the_settled_cost_of_an_assistant_answer(db):
    member = create_member("receipt@example.test")
    chat = Chat.objects.create(owner=member, title="Проверка квитанции")
    answer = Message.objects.create(
        chat=chat,
        role=Message.Role.ASSISTANT,
        resolved_model="acme/precise",
        parts=[{"type": "text", "text": "Готово"}],
        text="Готово",
    )
    quote = Quote.objects.create(
        user=member,
        mode="text",
        request_hash="f" * 64,
        resolved_model="acme/precise",
        estimated_cost_micro=12_000,
        expires_at=timezone.now() + timedelta(minutes=1),
    )
    run = Run.objects.create(
        user=member,
        chat=chat,
        quote=quote,
        output_message=answer,
        mode="text",
        status=Run.Status.COMPLETED,
        idempotency_key="restore-receipt",
        payload_hash="a" * 64,
        estimated_cost_micro=12_000,
    )
    RunAttempt.objects.create(
        run=run,
        provider="openrouter",
        requested_model="acme/precise",
        resolved_model="acme/precise",
        status=RunAttempt.Status.COMPLETED,
        billed_cost_micro=8_750,
    )
    client = Client()
    client.force_login(member)

    response = client.get(f"/api/v1/chats/{chat.id}")

    assert response.status_code == 200
    assert response.json()["data"]["messages"][0]["costMicro"] == 8_750


def test_member_can_save_an_owned_answer_as_a_private_artifact_with_its_provenance(db):
    member = create_member("artifact@example.test")
    other_member = create_member("other-artifact@example.test")
    chat = Chat.objects.create(owner=member, title="Research packet")
    answer = Message.objects.create(
        chat=chat,
        role=Message.Role.ASSISTANT,
        mode="research",
        resolved_model="acme/research",
        parts=[{"type": "text", "text": "Рынок растёт."}],
        text="Рынок растёт.",
    )
    quote = Quote.objects.create(
        user=member,
        mode="research",
        request_hash="c" * 64,
        resolved_model="acme/research",
        estimated_cost_micro=20_000,
        expires_at=timezone.now() + timedelta(minutes=1),
    )
    run = Run.objects.create(
        user=member,
        chat=chat,
        quote=quote,
        output_message=answer,
        mode="research",
        status=Run.Status.COMPLETED,
        idempotency_key="artifact-run",
        payload_hash="b" * 64,
        estimated_cost_micro=20_000,
    )
    RunAttempt.objects.create(
        run=run,
        provider="openrouter",
        requested_model="acme/research",
        resolved_model="acme/research",
        status=RunAttempt.Status.COMPLETED,
        billed_cost_micro=15_000,
    )
    RunSource.objects.create(run=run, message=answer, position=0, url="https://example.test/report", title="Market report")
    client = Client()
    client.force_login(member)
    other_client = Client()
    other_client.force_login(other_member)

    created = client.post(
        "/api/v1/artifacts",
        data={"messageId": str(answer.id), "kind": "research_packet", "title": "Рынок / кратко"},
        content_type="application/json",
    )
    listed = client.get("/api/v1/artifacts")
    detail = client.get(f"/api/v1/artifacts/{created.json()['data']['id']}")
    denied = other_client.get(f"/api/v1/artifacts/{created.json()['data']['id']}")

    assert created.status_code == 201
    assert created.json()["data"]["title"] == "Рынок / кратко"
    assert created.json()["data"]["provenance"] == {
        "sourceMessageId": str(answer.id),
        "model": "acme/research",
        "mode": "research",
        "costMicro": 15_000,
        "sources": [{"url": "https://example.test/report", "title": "Market report"}],
    }
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()["data"]] == [created.json()["data"]["id"]]
    assert detail.status_code == 200
    assert detail.json()["data"]["body"] == "Рынок растёт."
    assert denied.status_code == 404
    assert Artifact.objects.filter(owner=member, source_message=answer).count() == 1


def test_artifact_rejects_other_members_message_or_empty_answer(db):
    member = create_member("artifact-guard@example.test")
    other_member = create_member("other-artifact-guard@example.test")
    foreign_answer = Message.objects.create(
        chat=Chat.objects.create(owner=other_member, title="private"),
        role=Message.Role.ASSISTANT,
        text="private",
    )
    empty_answer = Message.objects.create(
        chat=Chat.objects.create(owner=member, title="empty"),
        role=Message.Role.ASSISTANT,
        text="",
    )
    client = Client()
    client.force_login(member)

    foreign = client.post("/api/v1/artifacts", data={"messageId": str(foreign_answer.id)}, content_type="application/json")
    empty = client.post("/api/v1/artifacts", data={"messageId": str(empty_answer.id)}, content_type="application/json")

    assert foreign.status_code == 404
    assert empty.status_code == 422
    assert Artifact.objects.count() == 0


def test_member_can_save_a_completed_answer_as_a_private_reusable_recipe(db):
    member = create_member("recipe@example.test")
    chat = Chat.objects.create(owner=member, title="Launch brief")
    prompt = Message.objects.create(chat=chat, role=Message.Role.USER, mode="text", text="Собери launch brief")
    answer = Message.objects.create(
        chat=chat,
        parent=prompt,
        role=Message.Role.ASSISTANT,
        mode="text",
        resolved_model="openai/gpt-5",
        text="Готовый бриф",
    )
    quote = Quote.objects.create(
        user=member,
        mode="text",
        request_hash="d" * 64,
        resolved_model="openai/gpt-5",
        estimated_cost_micro=9000,
        expires_at=timezone.now() + timedelta(minutes=1),
    )
    run = Run.objects.create(
        user=member,
        chat=chat,
        quote=quote,
        input_message=prompt,
        output_message=answer,
        mode="text",
        status=Run.Status.COMPLETED,
        idempotency_key="recipe-run",
        payload_hash="e" * 64,
        estimated_cost_micro=9000,
    )
    RunAttempt.objects.create(
        run=run,
        provider="openrouter",
        requested_model="openai/gpt-5",
        resolved_model="openai/gpt-5",
        status=RunAttempt.Status.COMPLETED,
        billed_cost_micro=7000,
    )
    client = Client()
    client.force_login(member)

    created = client.post(
        "/api/v1/recipes",
        data={"messageId": str(answer.id), "title": "Launch / GPT-5"},
        content_type="application/json",
    )
    repeated = client.post(
        "/api/v1/recipes",
        data={"messageId": str(answer.id), "title": "Launch / GPT-5"},
        content_type="application/json",
    )
    listed = client.get("/api/v1/recipes")

    assert created.status_code == 201
    assert created.json()["data"] == {
        "id": created.json()["data"]["id"],
        "projectId": None,
        "chatId": str(chat.id),
        "sourceMessageId": str(answer.id),
        "title": "Launch / GPT-5",
        "prompt": "Собери launch brief",
        "mode": "text",
        "model": "openai/gpt-5",
        "sourceCostMicro": 7000,
        "createdAt": created.json()["data"]["createdAt"],
    }
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()["data"]] == [created.json()["data"]["id"]]
    assert repeated.status_code == 200
    assert repeated.json()["data"]["id"] == created.json()["data"]["id"]
    assert Recipe.objects.filter(owner=member, source_message=answer).count() == 1


def test_recipe_requires_an_owned_answer_with_a_real_input_route(db):
    member = create_member("recipe-guard@example.test")
    other_member = create_member("other-recipe-guard@example.test")
    foreign_answer = Message.objects.create(chat=Chat.objects.create(owner=other_member, title="private"), role=Message.Role.ASSISTANT, text="private")
    orphan_answer = Message.objects.create(chat=Chat.objects.create(owner=member, title="orphan"), role=Message.Role.ASSISTANT, text="orphan")
    client = Client()
    client.force_login(member)

    foreign = client.post("/api/v1/recipes", data={"messageId": str(foreign_answer.id)}, content_type="application/json")
    orphan = client.post("/api/v1/recipes", data={"messageId": str(orphan_answer.id)}, content_type="application/json")

    assert foreign.status_code == 404
    assert orphan.status_code == 422
    assert Recipe.objects.count() == 0
