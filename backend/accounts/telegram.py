"""Telegram Login Widget: проверка подписи по https://core.telegram.org/widgets/login#checking-authorization."""

import hashlib
import hmac
import time

# служебный адрес аккаунта без почты: домен .invalid зарезервирован и никогда не доставляется (RFC 2606)
EMAIL_DOMAIN = "telegram.kurai.invalid"


def has_mailbox(email: str) -> bool:
    return not email.endswith(f"@{EMAIL_DOMAIN}")


def verified_login(data, *, bot_token: str, max_age: int, now: float | None = None) -> dict | None:
    """The widget's fields if Telegram signed them for this bot recently, otherwise None.

    Telegram signs every field it sends except `hash`, so all scalar fields take part in the check:
    a field added by anyone else breaks the signature instead of slipping through.
    """
    if not isinstance(data, dict) or not bot_token:
        return None
    received = data.get("hash")
    fields = {key: value for key, value in data.items() if key != "hash" and isinstance(value, (str, int)) and not isinstance(value, bool)}
    if not isinstance(received, str) or "id" not in fields or "auth_date" not in fields:
        return None
    check = "\n".join(f"{key}={fields[key]}" for key in sorted(fields))
    secret = hashlib.sha256(bot_token.encode()).digest()
    expected = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received):
        return None
    try:
        int(fields["id"])
        age = (time.time() if now is None else now) - int(fields["auth_date"])
    except (TypeError, ValueError):
        return None
    return fields if 0 <= age <= max_age else None
