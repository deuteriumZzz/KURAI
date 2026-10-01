import hashlib
import json
from decimal import Decimal, ROUND_CEILING

from django.conf import settings


def as_decimal(value) -> Decimal:
    """Catalog values may be fresh model strings or hydrated Decimal instances."""
    return value if isinstance(value, Decimal) else Decimal(str(value))


def estimate_cost_micro(*, model, text: str, mode: str = "text") -> int:
    """Reserve a bounded maximum based on the catalog snapshot, never a client hint."""
    if mode == "image":
        amount_usd = as_decimal(model.image_price_usd_per_generation)
        micro = int((amount_usd * Decimal(settings.KURAI_CREDITS_PER_USD)).to_integral_value(rounding=ROUND_CEILING))
        return max(settings.KURAI_MIN_RUN_COST_MICRO, micro)
    if mode == "video":
        amount_usd = as_decimal(model.video_price_usd_per_second) * settings.KURAI_VIDEO_DEFAULT_DURATION_SECONDS
        micro = int((amount_usd * Decimal(settings.KURAI_CREDITS_PER_USD)).to_integral_value(rounding=ROUND_CEILING))
        return max(settings.KURAI_MIN_RUN_COST_MICRO, micro)
    if mode == "audio":
        amount_usd = as_decimal(model.audio_price_usd_per_character) * len(text)
        micro = int((amount_usd * Decimal(settings.KURAI_CREDITS_PER_USD)).to_integral_value(rounding=ROUND_CEILING))
        return max(settings.KURAI_MIN_RUN_COST_MICRO, micro)
    input_tokens = max(1, (len(text) + 3) // 4)
    amount_usd = (as_decimal(model.prompt_price_usd_per_token) * input_tokens) + (
        as_decimal(model.completion_price_usd_per_token) * settings.KURAI_MAX_COMPLETION_TOKENS
    )
    if mode == "research":
        # The provider may use fewer searches, but the hold must cover the configured hard cap.
        amount_usd += as_decimal(settings.KURAI_RESEARCH_SEARCH_COST_USD_PER_USE) * settings.KURAI_RESEARCH_MAX_USES
    micro = int((amount_usd * Decimal(settings.KURAI_CREDITS_PER_USD)).to_integral_value(rounding=ROUND_CEILING))
    return max(settings.KURAI_MIN_RUN_COST_MICRO, micro)


def canonical_attachment_ids(attachment_ids) -> list[str]:
    return sorted({str(attachment_id) for attachment_id in attachment_ids})


def append_run_notice(message, notice: str) -> None:
    """Add a server-owned lifecycle notice without ever interpolating user/provider text."""
    if notice in message.text:
        return
    next_text = f"{message.text.rstrip()}\n\n_{notice}_".strip()
    message.text = next_text
    message.parts = [{"type": "text", "text": next_text}]
    message.save(update_fields=("text", "parts"))


def request_hash(*, mode: str, model_id: str, text: str, attachment_ids=()) -> str:
    canonical = json.dumps(
        {"mode": mode, "modelId": model_id, "text": text, "attachmentIds": canonical_attachment_ids(attachment_ids)},
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def run_payload_hash(*, chat_id: str, quote_id: str, mode: str, model_id: str, text: str, attachment_ids=(), parent_id=None) -> str:
    canonical = json.dumps(
        {
            "chatId": chat_id, "quoteId": quote_id, "mode": mode, "modelId": model_id, "text": text,
            "attachmentIds": canonical_attachment_ids(attachment_ids), "parentId": str(parent_id) if parent_id else None,
        },
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def compare_payload_hash(*, chat_id: str, mode: str, text: str, routes, attachment_ids=(), parent_id=None) -> str:
    """Bind an idempotency key to the exact ordered set of explicitly chosen routes."""
    canonical = json.dumps(
        {
            "chatId": chat_id,
            "mode": mode,
            "text": text,
            "routes": [{"modelId": route["modelId"], "quoteId": str(route["quoteId"])} for route in routes],
            "attachmentIds": canonical_attachment_ids(attachment_ids),
            "parentId": str(parent_id) if parent_id else None,
        },
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
