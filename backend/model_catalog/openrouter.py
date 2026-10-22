import json
import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

from model_catalog.models import CatalogModel


class OpenRouterCatalogError(RuntimeError):
    pass


def as_decimal(value) -> Decimal:
    try:
        return Decimal(str(value or "0"))
    except InvalidOperation:
        return Decimal("0")


def fetch_list(path: str) -> list[dict]:
    """One OpenRouter registry listing; a broken or partial answer fails the whole sync, never half-applies it."""
    headers = {"Accept": "application/json"}
    if settings.OPENROUTER_API_KEY:
        headers["Authorization"] = f"Bearer {settings.OPENROUTER_API_KEY}"
    request = Request(f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/{path}", headers=headers, method="GET")
    try:
        with urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise OpenRouterCatalogError(f"OpenRouter {path} could not be loaded") from error
    data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(data, list):
        raise OpenRouterCatalogError(f"OpenRouter returned an invalid {path}")
    return [item for item in data if isinstance(item, dict) and isinstance(item.get("id"), str)]


def fetch_catalog() -> list[dict]:
    # без фильтра OpenRouter отдаёт в основном текстовые модели; медиа — отдельными запросами ниже
    return fetch_list("models")


def fetch_image_catalog() -> list[dict]:
    """Text-to-image models with a per-image price.

    Prices come from the model listing, where an image is priced by output tokens; the image
    registry says which models need a reference picture (edit-only) — those cannot start from text.
    """
    edit_only = set()
    for item in fetch_list("images/models"):
        params = item.get("supported_parameters") if isinstance(item.get("supported_parameters"), dict) else {}
        references = params.get("input_references") if isinstance(params.get("input_references"), dict) else {}
        if (references.get("min") or 0) >= 1:
            edit_only.add(item["id"])
    records: list[dict] = []
    for item in fetch_list("models?output_modalities=image"):
        pricing = item.get("pricing") if isinstance(item.get("pricing"), dict) else {}
        per_token = as_decimal(pricing.get("image_output"))
        # векторные модели отдают SVG — его нельзя безопасно показывать в браузере с нашего домена
        vector = any(marker in f'{item["id"]} {item.get("name") or ""}'.lower() for marker in ("vector", "svg"))
        if item["id"] in edit_only or per_token <= 0 or vector:
            continue
        records.append({
            "id": item["id"],
            "name": str(item.get("name") or item["id"]),
            "description": str(item.get("description") or ""),
            "architecture": {"input_modalities": ["text"], "output_modalities": ["image"]},
            "pricing": {"image_generation": str(per_token * settings.KURAI_IMAGE_OUTPUT_TOKENS)},
        })
    return records


def fetch_speech_catalog() -> list[dict]:
    """Text-to-speech models priced per input character — the only price known before synthesis."""
    records: list[dict] = []
    for item in fetch_list("models?output_modalities=speech"):
        pricing = item.get("pricing") if isinstance(item.get("pricing"), dict) else {}
        # цена за токены звука зависит от длины записи, её не узнать до генерации — такие модели не берём
        if as_decimal(pricing.get("completion")) != 0:
            continue
        records.append({
            "id": item["id"],
            "name": str(item.get("name") or item["id"]),
            "description": str(item.get("description") or ""),
            "architecture": {"input_modalities": ["text"], "output_modalities": ["speech"]},
            "pricing": {"speech": str(as_decimal(pricing.get("prompt")))},
            # часть моделей без голоса отклоняет запрос — храним объявленные, первый идёт по умолчанию
            "media_spec": {"voices": [voice for voice in item.get("supported_voices") or () if isinstance(voice, str)]},
        })
    return records


# разрешение, которое KURAI заказывает у видеомодели: первое из объявленных по этому порядку
VIDEO_RESOLUTIONS = ("720p", "768p", "1080p", "480p", "360p", "1K", "2K", "4K")
_SKU_RESOLUTION = re.compile(r"_(360p|480p|720p|768p|1080p|1k|2k|4k)$")
# цены за входные кадры, продолжение ролика, правку видео и токены — не цена генерации из текста по секундам
_SKU_NOT_TEXT_TO_VIDEO = ("image_input", "reference", "image_to_video", "continuation", "with_video_input", "video_tokens", "minimum", "megapixel", "per_image")


def video_price_per_second(skus: dict, resolution: str | None) -> Decimal | None:
    """Price of one second at the resolution KURAI requests; the highest matching SKU, so the hold covers audio too."""
    prices = []
    for key, value in skus.items():
        if "second" not in key or any(marker in key for marker in _SKU_NOT_TEXT_TO_VIDEO):
            continue
        suffix = _SKU_RESOLUTION.search(key)
        if suffix and (resolution is None or suffix.group(1) != resolution.lower()):
            continue
        prices.append(as_decimal(value) / (100 if key.startswith("cents_") else 1))
    return max(prices, default=None)


def fetch_video_catalog() -> list[dict]:
    """Adapt OpenRouter's separate video registry to the local catalog shape."""
    records: list[dict] = []
    for item in fetch_list("videos/models"):
        durations = item.get("supported_durations")
        # монтаж, апскейл и аватары не объявляют длительность: им нужен готовый ролик или фото, не текст
        if not isinstance(durations, list) or not durations:
            continue
        resolutions = item.get("supported_resolutions") if isinstance(item.get("supported_resolutions"), list) else []
        resolution = next((value for value in VIDEO_RESOLUTIONS if value in resolutions), None)
        skus = item.get("pricing_skus") if isinstance(item.get("pricing_skus"), dict) else {}
        per_second = video_price_per_second(skus, resolution)
        # цена только в токенах видео не известна до генерации — такую модель не предлагаем
        if per_second is None:
            continue
        aspects = item.get("supported_aspect_ratios") if isinstance(item.get("supported_aspect_ratios"), list) else []
        records.append(
            {
                "id": item["id"],
                "name": str(item.get("name") or item["id"]),
                "description": str(item.get("description") or ""),
                "architecture": {"input_modalities": ["text"], "output_modalities": ["video"]},
                "pricing": {"video": str(per_second)},
                "media_spec": {
                    "durations": sorted({value for value in durations if isinstance(value, int) and value > 0}),
                    "resolution": resolution,
                    "aspects": [value for value in aspects if isinstance(value, str)],
                },
            }
        )
    return records


def fetch_full_catalog() -> list[dict]:
    return [*fetch_catalog(), *fetch_image_catalog(), *fetch_speech_catalog(), *fetch_video_catalog()]


_SENTENCE = re.compile(r"(?<=[.!?])\s+")


def public_description(text: str) -> str:
    """Model blurb for members: sentences naming the upstream gateway are dropped — it is an implementation detail."""
    return " ".join(part for part in _SENTENCE.split(text.strip()) if "openrouter" not in part.lower())


def sync_catalog(records: list[dict]) -> int:
    merged_records: dict[str, dict] = {}
    for record in records:
        model_id = record.get("id") if isinstance(record, dict) else None
        if not isinstance(model_id, str) or not model_id:
            continue
        existing = merged_records.get(model_id)
        if existing is None:
            merged_records[model_id] = record
            continue
        existing_architecture = existing.get("architecture") if isinstance(existing.get("architecture"), dict) else {}
        next_architecture = record.get("architecture") if isinstance(record.get("architecture"), dict) else {}
        existing["architecture"] = {
            "input_modalities": sorted(set(existing_architecture.get("input_modalities") or []) | set(next_architecture.get("input_modalities") or [])),
            "output_modalities": sorted(set(existing_architecture.get("output_modalities") or []) | set(next_architecture.get("output_modalities") or [])),
        }
        existing_pricing = existing.get("pricing") if isinstance(existing.get("pricing"), dict) else {}
        next_pricing = record.get("pricing") if isinstance(record.get("pricing"), dict) else {}
        existing["pricing"] = {**existing_pricing, **next_pricing}
        if record.get("media_spec"):
            existing["media_spec"] = {**(existing.get("media_spec") or {}), **record["media_spec"]}
        if not existing.get("description") and record.get("description"):
            existing["description"] = record["description"]

    seen_ids: list[str] = []
    now = datetime.now(timezone.utc)
    for record in merged_records.values():
        model_id = record.get("id")
        if not isinstance(model_id, str) or not model_id or len(model_id) > 160:
            continue
        # служебные роутеры шлюза участнику не нужны; «Авто» — вход KURAI и называется по-нашему
        auto = model_id == "openrouter/auto"
        if model_id.startswith("openrouter/") and not auto:
            continue
        architecture = record.get("architecture") if isinstance(record.get("architecture"), dict) else {}
        pricing = record.get("pricing") if isinstance(record.get("pricing"), dict) else {}
        provider = "KURAI" if auto else model_id.split("/", 1)[0].replace("-", " ").title()
        CatalogModel.objects.update_or_create(
            id=model_id,
            defaults={
                "name": "Авто" if auto else str(record.get("name") or model_id),
                "provider": provider[:100],
                "description": "" if auto else public_description(str(record.get("description") or ""))[:10_000],
                "input_modalities": architecture.get("input_modalities") or [],
                "output_modalities": architecture.get("output_modalities") or [],
                "context_length": max(0, int(record.get("context_length") or 0)),
                "prompt_price_usd_per_token": as_decimal(pricing.get("prompt")),
                "completion_price_usd_per_token": as_decimal(pricing.get("completion")),
                # pricing.image у OpenRouter — цена входной картинки; цену генерации считает fetch_image_catalog
                "image_price_usd_per_generation": as_decimal(pricing.get("image_generation")),
                "audio_price_usd_per_character": as_decimal(pricing.get("speech") or pricing.get("audio")),
                "video_price_usd_per_second": as_decimal(pricing.get("video")),
                "media_spec": record.get("media_spec") or {},
                "active": True,
                "is_router": auto,
                "synced_at": now,
            },
        )
        seen_ids.append(model_id)
    CatalogModel.objects.exclude(id="openrouter/auto").exclude(id__in=seen_ids).update(active=False)
    return len(seen_ids)
