"""Курсы валют к доллару для показа цен в валюте региона. Деньги списываются в кредитах; это только отображение."""

import json
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.cache import cache

_FRESH = "fx:usd:fresh"
_LAST = "fx:usd:last"
_BACKOFF = "fx:usd:backoff"


def _published(raw: dict[str, float], last: dict | None) -> dict[str, float]:
    """Курс для показа: с запасом на конвертацию и «залипший» — прежнее значение остаётся, пока чистый курс не сдвинулся больше порога."""
    previous = (last or {}).get("rates", {})
    shown = {}
    for code, rate in raw.items():
        wanted = rate if code == "USD" else rate * (1 + settings.KURAI_FX_BUFFER)
        old = previous.get(code)
        shown[code] = old if old and abs(wanted / old - 1) <= settings.KURAI_FX_THRESHOLD else wanted
    return shown


def usd_rates() -> dict | None:
    """Свежие курсы из кэша, иначе из источника; при сбое — последние удачные, а если их нет — None (цену не конвертируем)."""
    fresh = cache.get(_FRESH)
    if fresh:
        return fresh
    if cache.get(_BACKOFF):
        return cache.get(_LAST)
    try:
        with urlopen(Request(settings.KURAI_FX_URL, headers={"Accept": "application/json"}), timeout=5) as response:  # noqa: S310 — адрес из настроек
            body = json.load(response)
        rates = {code: float(rate) for code, rate in body["rates"].items() if isinstance(rate, (int, float)) and rate > 0}
        if body.get("result") != "success" or "USD" not in rates:
            raise ValueError("unexpected FX payload")
    except (OSError, ValueError, KeyError, TypeError):
        # не долбим источник на каждый запрос, пока он недоступен
        cache.set(_BACKOFF, True, 300)
        return cache.get(_LAST)
    payload = {"base": "USD", "rates": _published(rates, cache.get(_LAST)), "updatedAt": body.get("time_last_update_utc", "")}
    cache.set(_FRESH, payload, settings.KURAI_FX_TTL_SECONDS)
    cache.set(_LAST, payload, None)
    return payload
