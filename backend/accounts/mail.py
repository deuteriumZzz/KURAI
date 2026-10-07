"""Member letters: password reset and email confirmation. Links point at the KURAI web app."""

import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

log = logging.getLogger(__name__)
VERIFY_SALT = "kurai.verify-email"


def mail_ready() -> bool:
    """Letters can actually leave the server: SMTP needs a host; console (development) and memory (tests) always work."""
    return bool(settings.EMAIL_HOST) or not settings.EMAIL_BACKEND.endswith("smtp.EmailBackend")


def deliver(subject: str, body: str, to: str) -> bool:
    """Best effort: a mail outage must not break sign-up; the failure is logged without the recipient."""
    if not mail_ready():
        return False
    try:
        send_mail(subject, body, None, [to])
    except Exception:
        log.exception("member letter was not delivered")
        return False
    return True


def send_password_reset(user) -> bool:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    hours = max(1, settings.PASSWORD_RESET_TIMEOUT // 3600)
    link = f"{settings.KURAI_FRONTEND_URL}/reset?uid={uid}&token={token}"
    body = (
        "Чтобы задать новый пароль для KURAI, откройте ссылку:\n"
        f"{link}\n\n"
        f"Ссылка действует {hours} ч и сработает один раз. "
        "Если вы не просили сброс, просто проигнорируйте письмо — пароль останется прежним."
    )
    return deliver("KURAI · сброс пароля", body, user.email)


def verification_token(user) -> str:
    # the address is part of the signed payload: changing the email invalidates older links
    return signing.dumps({"u": str(user.pk), "e": user.email}, salt=VERIFY_SALT)


def read_verification_token(token: str) -> tuple[str, str] | None:
    try:
        data = signing.loads(token, salt=VERIFY_SALT, max_age=settings.KURAI_EMAIL_VERIFY_MAX_AGE_SECONDS)
    except signing.BadSignature:  # includes SignatureExpired
        return None
    return data.get("u"), data.get("e")


def send_verification(user) -> bool:
    link = f"{settings.KURAI_FRONTEND_URL}/verify?token={verification_token(user)}"
    days = max(1, settings.KURAI_EMAIL_VERIFY_MAX_AGE_SECONDS // 86400)
    body = f"Подтвердите адрес для KURAI — откройте ссылку:\n{link}\n\nСсылка действует {days} дн."
    return deliver("KURAI · подтверждение почты", body, user.email)
