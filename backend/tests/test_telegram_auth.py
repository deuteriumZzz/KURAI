import hashlib
import hmac
import time

from django.test import Client
from django.test.utils import override_settings

from accounts.models import TelegramIdentity
from ledger.services import available_balance_micro

TOKEN = "123456:test-bot-token"


def signed(fields: dict, token: str = TOKEN) -> dict:
    """Sign widget fields the way Telegram does."""
    check = "\n".join(f"{key}={fields[key]}" for key in sorted(fields))
    secret = hashlib.sha256(token.encode()).digest()
    return {**fields, "hash": hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()}


def widget(**extra) -> dict:
    return signed({"id": 424242, "first_name": "Анна", "username": "anna_k", "auth_date": int(time.time()), **extra})


def csrf_client() -> Client:
    client = Client(enforce_csrf_checks=True)
    client.defaults["HTTP_X_CSRFTOKEN"] = client.get("/api/v1/auth/csrf").json()["data"]["csrfToken"]
    return client


@override_settings(TELEGRAM_BOT_TOKEN=TOKEN)
def test_first_telegram_login_creates_an_account_with_signup_credits_and_a_session(db):
    client = csrf_client()

    response = client.post("/api/v1/auth/telegram", data=widget(), content_type="application/json")
    member = response.json()["data"]

    assert response.status_code == 200
    assert member["displayName"] == "Анна"
    # служебный адрес наружу не уходит, подтверждать нечего
    assert member["email"] == "" and member["emailVerified"] is True
    me = client.get("/api/v1/me")
    assert me.status_code == 200
    assert available_balance_micro(me.wsgi_request.user.credit_account) == 100_000


@override_settings(TELEGRAM_BOT_TOKEN=TOKEN)
def test_repeat_telegram_login_returns_the_same_account(db):
    first = csrf_client().post("/api/v1/auth/telegram", data=widget(), content_type="application/json").json()["data"]
    second = csrf_client().post("/api/v1/auth/telegram", data=widget(), content_type="application/json").json()["data"]

    assert first["id"] == second["id"]
    assert TelegramIdentity.objects.count() == 1


@override_settings(TELEGRAM_BOT_TOKEN=TOKEN)
def test_forged_or_stale_telegram_login_is_rejected(db):
    forged = widget()
    forged["id"] = 1
    stale = signed({"id": 424242, "first_name": "Анна", "auth_date": int(time.time()) - 3 * 86400})
    other_bot = signed({"id": 424242, "auth_date": int(time.time())}, token="999:other-bot")

    for payload in (forged, stale, other_bot):
        response = csrf_client().post("/api/v1/auth/telegram", data=payload, content_type="application/json")
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "invalid_telegram_login"
    assert TelegramIdentity.objects.count() == 0


@override_settings(TELEGRAM_BOT_TOKEN="")
def test_telegram_login_is_off_without_a_bot_token(db):
    response = csrf_client().post("/api/v1/auth/telegram", data=widget(), content_type="application/json")
    assert response.status_code == 404
