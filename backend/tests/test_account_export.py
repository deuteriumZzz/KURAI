import json
from io import BytesIO
from zipfile import ZipFile

from django.contrib.auth import get_user_model
from django.test import Client

from ledger.services import grant_credits
from workspace.models import Chat, Message, Project


def test_member_can_download_a_private_portable_workspace_export(db):
    member = get_user_model().objects.create_user(email="export@example.test", password="safe-test-password", display_name="Export user")
    project = Project.objects.create(owner=member, name="Product", accent="cyan")
    chat = Chat.objects.create(owner=member, project=project, title="Strategy")
    Message.objects.create(chat=chat, role=Message.Role.USER, text="Build a plan", parts=[{"type": "text", "text": "Build a plan"}])
    grant_credits(member, 5_000, correlation_id="export-grant")
    client = Client()
    client.force_login(member)

    response = client.get("/api/v1/me/export")

    assert response.status_code == 200
    assert response["Content-Type"] == "application/zip"
    assert response["Cache-Control"] == "no-store"
    with ZipFile(BytesIO(response.content)) as archive:
        assert set(archive.namelist()) == {"profile.json", "workspace.json", "ledger.json"}
        profile = json.loads(archive.read("profile.json"))
        workspace = json.loads(archive.read("workspace.json"))
        ledger = json.loads(archive.read("ledger.json"))
    assert profile == {"id": str(member.id), "email": member.email, "displayName": "Export user"}
    assert workspace["projects"][0]["name"] == "Product"
    assert workspace["messages"][0]["text"] == "Build a plan"
    assert "password" not in json.dumps({"profile": profile, "workspace": workspace, "ledger": ledger}).lower()


def test_account_export_requires_an_authenticated_member(db):
    response = Client().get("/api/v1/me/export")

    assert response.status_code == 401
