import re

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import Client
from django.test.utils import override_settings

PASSWORD = "safe-test-password"
NEW_PASSWORD = "another-safe-password-42"


def member(email="reset@example.test"):
    return get_user_model().objects.create_user(email=email, password=PASSWORD)


def link_params(body: str) -> dict:
    url = re.search(r"https?://\S+", body).group(0)
    return dict(pair.split("=", 1) for pair in url.split("?", 1)[1].split("&"))


def test_reset_sends_a_one_time_link_and_never_reveals_unknown_addresses(db):
    user = member()
    client = Client()

    known = client.post("/api/v1/auth/password-reset", data={"email": "RESET@example.test"}, content_type="application/json")
    unknown = client.post("/api/v1/auth/password-reset", data={"email": "nobody@example.test"}, content_type="application/json")

    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()
    assert len(mail.outbox) == 1 and mail.outbox[0].to == [user.email]
    params = link_params(mail.outbox[0].body)

    weak = client.post("/api/v1/auth/password-reset/confirm", data={**params, "password": "123456789012"}, content_type="application/json")
    assert weak.status_code == 422

    changed = client.post("/api/v1/auth/password-reset/confirm", data={**params, "password": NEW_PASSWORD}, content_type="application/json")
    reused = client.post("/api/v1/auth/password-reset/confirm", data={**params, "password": NEW_PASSWORD + "x"}, content_type="application/json")

    assert changed.status_code == 200
    assert reused.status_code == 400 and reused.json()["error"]["code"] == "reset_link_invalid"
    assert client.post("/api/v1/auth/login", data={"email": user.email, "password": NEW_PASSWORD}, content_type="application/json").status_code == 200


def test_tampered_reset_link_is_rejected(db):
    member()
    client = Client()
    client.post("/api/v1/auth/password-reset", data={"email": "reset@example.test"}, content_type="application/json")
    params = link_params(mail.outbox[0].body)

    tampered = client.post("/api/v1/auth/password-reset/confirm", data={"uid": params["uid"], "token": "bad-token", "password": NEW_PASSWORD}, content_type="application/json")
    garbage = client.post("/api/v1/auth/password-reset/confirm", data={"uid": "!!", "token": params["token"], "password": NEW_PASSWORD}, content_type="application/json")

    assert tampered.status_code == garbage.status_code == 400


def test_sign_up_sends_a_confirmation_link_that_verifies_the_address(db):
    client = Client()
    created = client.post("/api/v1/auth/sign-up", data={"email": "verify@example.test", "password": PASSWORD}, content_type="application/json")
    assert created.status_code == 201 and created.json()["data"]["emailVerified"] is False
    token = link_params(mail.outbox[0].body)["token"]

    stranger = Client()
    verified = stranger.post("/api/v1/auth/verify-email", data={"token": token}, content_type="application/json")
    forged = stranger.post("/api/v1/auth/verify-email", data={"token": token[:-2] + "xx"}, content_type="application/json")

    assert verified.status_code == 200
    assert forged.status_code == 400 and forged.json()["error"]["code"] == "verify_link_invalid"
    assert client.get("/api/v1/me").json()["data"]["emailVerified"] is True


def test_resend_confirmation_only_for_unverified_members(db):
    user = member("resend@example.test")
    client = Client()
    client.force_login(user)

    first = client.post("/api/v1/auth/verify-email/resend")
    assert first.status_code == 202 and len(mail.outbox) == 1
    client.post("/api/v1/auth/verify-email", data={"token": link_params(mail.outbox[0].body)["token"]}, content_type="application/json")
    again = client.post("/api/v1/auth/verify-email/resend")
    assert again.status_code == 200 and again.json()["data"]["emailVerified"] is True and len(mail.outbox) == 1


@override_settings(EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend", EMAIL_HOST="")
def test_without_a_mail_server_reset_is_honestly_unavailable(db):
    member()
    response = Client().post("/api/v1/auth/password-reset", data={"email": "reset@example.test"}, content_type="application/json")

    assert response.status_code == 503 and response.json()["error"]["code"] == "mail_unavailable"
    assert "mail_unconfigured" in Client().get("/api/v1/status").json()["data"]["reasons"]
