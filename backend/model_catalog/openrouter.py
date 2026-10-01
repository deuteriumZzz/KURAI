import json
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


def fetch_catalog() -> list[dict]:
    headers = {"Accept": "application/json"}
    if settings.OPENROUTER_API_KEY:
        headers["Authorization"] = f"Bearer {settings.OPENROUTER_API_KEY}"
    request = Request(f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/models", headers=headers, method="GET")
    try:
        with urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise OpenRouterCatalogError("OpenRouter catalog could not be loaded") from error
    data = payload.get("data")
    if not isinstance(data, list):
        raise OpenRouterCatalogError("OpenRouter returned an invalid catalog")
    return data


def fetch_video_catalog() -> list[dict]:
    """Adapt OpenRouter's separate video registry to the local catalog shape."""
    headers = {"Accept": "application/json"}
    if settings.OPENROUTER_API_KEY:
        headers["Authorization"] = f"Bearer {settings.OPENROUTER_API_KEY}"
    request = Request(f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/videos/models", headers=headers, method="GET")
    try:
        with urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise OpenRouterCatalogError("OpenRouter video catalog could not be loaded") from error
    data = payload.get("data")
    if not isinstance(data, list):
        raise OpenRouterCatalogError("OpenRouter returned an invalid video catalog")
    records: list[dict] = []
    for item in data:
        if not isinstance(item, dict) or not isinstance(item.get("id"), str):
            continue
        prices = item.get("pricing_skus") if isinstance(item.get("pricing_skus"), dict) else {}
        per_second = min((as_decimal(value) for key, value in prices.items() if key.startswith("per-video-second")), default=Decimal("0"))
        records.append(
            {
                "id": item["id"],
                "name": str(item.get("name") or item["id"]),
                "description": str(item.get("description") or ""),
                "architecture": {"input_modalities": ["text"], "output_modalities": ["video"]},
                "pricing": {"video": str(per_second)},
            }
        )
    return records


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
        if not existing.get("description") and record.get("description"):
            existing["description"] = record["description"]

    seen_ids: list[str] = []
    now = datetime.now(timezone.utc)
    for record in merged_records.values():
        model_id = record.get("id")
        if not isinstance(model_id, str) or not model_id or len(model_id) > 160:
            continue
        architecture = record.get("architecture") if isinstance(record.get("architecture"), dict) else {}
        pricing = record.get("pricing") if isinstance(record.get("pricing"), dict) else {}
        provider = model_id.split("/", 1)[0].replace("-", " ").title()
        CatalogModel.objects.update_or_create(
            id=model_id,
            defaults={
                "name": str(record.get("name") or model_id),
                "provider": provider[:100],
                "description": str(record.get("description") or "")[:10_000],
                "input_modalities": architecture.get("input_modalities") or [],
                "output_modalities": architecture.get("output_modalities") or [],
                "context_length": max(0, int(record.get("context_length") or 0)),
                "prompt_price_usd_per_token": as_decimal(pricing.get("prompt")),
                "completion_price_usd_per_token": as_decimal(pricing.get("completion")),
                "image_price_usd_per_generation": as_decimal(pricing.get("image")),
                "audio_price_usd_per_character": as_decimal(pricing.get("speech") or pricing.get("audio")),
                "video_price_usd_per_second": as_decimal(pricing.get("video")),
                "active": True,
                "is_router": False,
                "synced_at": now,
            },
        )
        seen_ids.append(model_id)
    CatalogModel.objects.exclude(id="openrouter/auto").exclude(id__in=seen_ids).update(active=False)
    return len(seen_ids)
