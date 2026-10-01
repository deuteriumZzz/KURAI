from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client
from django.test.utils import override_settings

from ledger.services import available_balance_micro, grant_credits


def csrf_client() -> Client:
    client = Client(enforce_csrf_checks=True)
    response = client.get("/api/v1/auth/csrf")
    assert response.status_code == 200
    client.defaults["HTTP_X_CSRFTOKEN"] = response.json()["data"]["csrfToken"]
    return client


def test_member_can_sign_up_and_read_their_session_identity(db):
    client = csrf_client()

    registered = client.post(
        "/api/v1/auth/sign-up",
        data={"email": "dmitry@example.test", "password": "safe-password-2026", "displayName": "Дмитрий"},
        content_type="application/json",
    )
    client.defaults["HTTP_X_CSRFTOKEN"] = registered.json()["data"]["csrfToken"]
    current = client.get("/api/v1/me")
    ledger = client.get("/api/v1/ledger")

    assert registered.status_code == 201
    assert registered.json()["data"]["email"] == "dmitry@example.test"
    assert current.status_code == 200
    assert current.json()["data"]["displayName"] == "Дмитрий"
    assert available_balance_micro(current.wsgi_request.user.credit_account) == 100_000
    assert ledger.json()["data"]["availableMicro"] == 100_000


def test_ledger_returns_an_account_scoped_append_only_history(db):
    client = csrf_client()
    registered = client.post(
        "/api/v1/auth/sign-up",
        data={"email": "ledger-history@example.test", "password": "safe-password-2026", "displayName": "Журнал"},
        content_type="application/json",
    )
    client.defaults["HTTP_X_CSRFTOKEN"] = registered.json()["data"]["csrfToken"]
    grant_credits(registered.wsgi_request.user, 25_000, correlation_id="manual-grant")

    response = client.get("/api/v1/ledger")

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["availableMicro"] == 125_000
    assert [entry["amountMicro"] for entry in payload["entries"]] == [25_000, 100_000]
    assert payload["entries"][0] == {
        "id": payload["entries"][0]["id"],
        "at": payload["entries"][0]["at"],
        "kind": "grant",
        "title": "Начисление кредитов",
        "model": None,
        "chatId": None,
        "amountMicro": 25_000,
    }


def test_login_rejects_bad_password_and_logout_closes_the_session(db):
    client = csrf_client()
    registered = client.post(
        "/api/v1/auth/sign-up",
        data={"email": "dmitry@example.test", "password": "safe-password-2026"},
        content_type="application/json",
    )
    client.defaults["HTTP_X_CSRFTOKEN"] = registered.json()["data"]["csrfToken"]
    client.post("/api/v1/auth/logout")

    bad_login = client.post(
        "/api/v1/auth/login",
        data={"email": "dmitry@example.test", "password": "wrong-password"},
        content_type="application/json",
    )
    logged_in = client.post(
        "/api/v1/auth/login",
        data={"email": "dmitry@example.test", "password": "safe-password-2026"},
        content_type="application/json",
    )
    client.defaults["HTTP_X_CSRFTOKEN"] = logged_in.json()["data"]["csrfToken"]
    signed_out = client.post("/api/v1/auth/logout")
    current = client.get("/api/v1/me")

    assert bad_login.status_code == 401
    assert bad_login.json()["error"]["code"] == "invalid_credentials"
    assert logged_in.status_code == 200
    assert signed_out.status_code == 200
    assert current.status_code == 401


def test_signup_validates_a_realistic_password_before_creating_a_member(db):
    client = csrf_client()

    response = client.post(
        "/api/v1/auth/sign-up",
        data={"email": "dmitry@example.test", "password": "short"},
        content_type="application/json",
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_signup_treats_email_identity_as_case_insensitive(db):
    client = csrf_client()
    client.post(
        "/api/v1/auth/sign-up",
        data={"email": "Dmitry@Example.test", "password": "safe-password-2026"},
        content_type="application/json",
    )
    refreshed = client.get("/api/v1/auth/csrf")
    client.defaults["HTTP_X_CSRFTOKEN"] = refreshed.json()["data"]["csrfToken"]

    duplicate = client.post(
        "/api/v1/auth/sign-up",
        data={"email": "dmitry@example.test", "password": "safe-password-2026"},
        content_type="application/json",
    )

    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "email_already_used"


@override_settings(AUTH_RATE_LIMIT_COUNT=2, AUTH_RATE_LIMIT_WINDOW_SECONDS=60)
def test_login_rate_limit_blocks_repeated_invalid_attempts(db):
    cache.clear()
    client = Client()
    get_user_model().objects.create_user(email="limited@example.test", password="safe-test-password")

    first = client.post("/api/v1/auth/login", data={"email": "limited@example.test", "password": "bad"}, content_type="application/json")
    second = client.post("/api/v1/auth/login", data={"email": "limited@example.test", "password": "bad"}, content_type="application/json")
    third = client.post("/api/v1/auth/login", data={"email": "limited@example.test", "password": "bad"}, content_type="application/json")

    assert first.status_code == second.status_code == 401
    assert third.status_code == 429
    assert third.json()["error"]["code"] == "rate_limited"
