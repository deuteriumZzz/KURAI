import hashlib
import json
from decimal import Decimal, ROUND_CEILING

from django.conf import settings

from runs.options import completion_tokens, search_uses


def as_decimal(value) -> Decimal:
    """Catalog values may be fresh model strings or hydrated Decimal instances."""
    return value if isinstance(value, Decimal) else Decimal(str(value))


def estimate_parts_usd(*, model, text: str, mode: str = "text", options: dict | None = None) -> dict[str, Decimal]:
    """The reserve formula split into the parts the composer shows as cells; the reserve itself sums them."""
    options = options or {}
    if mode == "image":
        return {"generation": as_decimal(model.image_price_usd_per_generation) * options.get("count", 1)}
    if mode == "video":
        return {"generation": as_decimal(model.video_price_usd_per_second) * video_seconds(model, options)}
    if mode == "audio":
        return {"generation": as_decimal(model.audio_price_usd_per_character) * len(text)}
    input_tokens = max(1, (len(text) + 3) // 4)
    prompt_price = as_decimal(model.prompt_price_usd_per_token)
    completion_price = as_decimal(model.completion_price_usd_per_token)
    if model.is_router or prompt_price < 0 or completion_price < 0:
        # A router's price is only known after it picks a model: reserve the configured ceiling, not the minimum.
        prompt_price = settings.KURAI_VARIABLE_PROMPT_USD_PER_TOKEN
        completion_price = settings.KURAI_VARIABLE_COMPLETION_USD_PER_TOKEN
    base_tokens = completion_tokens({**options, "think": False})
    parts = {"input": prompt_price * input_tokens, "output": completion_price * base_tokens}
    # «Думать дольше» — отдельная ячейка: тот же потолок ответа, только сверх обычного
    if options.get("think"):
        parts["think"] = completion_price * (completion_tokens(options) - base_tokens)
    # The provider may use fewer searches, but the hold must cover the hard cap for this run.
    search = as_decimal(settings.KURAI_RESEARCH_SEARCH_COST_USD_PER_USE) * search_uses(mode, options)
    if search:
        parts["search"] = search
    return parts


def video_seconds(model, options: dict) -> int:
    """The clip length that is quoted, submitted and shown — snapped to what the model accepts."""
    return model.video_seconds(options.get("duration", settings.KURAI_VIDEO_DEFAULT_DURATION_SECONDS))


def usd_to_micro(amount_usd: Decimal) -> int:
    return int((amount_usd * Decimal(settings.KURAI_CREDITS_PER_USD)).to_integral_value(rounding=ROUND_CEILING))


def estimate_cost_micro(*, model, text: str, mode: str = "text", options: dict | None = None) -> int:
    """Reserve a bounded maximum based on the catalog snapshot and normalized run options, never a client hint."""
    amount_usd = sum(estimate_parts_usd(model=model, text=text, mode=mode, options=options).values(), Decimal(0))
    return max(settings.KURAI_MIN_RUN_COST_MICRO, usd_to_micro(amount_usd))


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


def request_hash(*, mode: str, model_id: str, text: str, attachment_ids=(), options: dict | None = None) -> str:
    canonical = json.dumps(
        {"mode": mode, "modelId": model_id, "text": text, "attachmentIds": canonical_attachment_ids(attachment_ids), "options": options or {}},
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def run_payload_hash(*, chat_id: str, quote_id: str, mode: str, model_id: str, text: str, attachment_ids=(), parent_id=None, options: dict | None = None) -> str:
    canonical = json.dumps(
        {
            "chatId": chat_id, "quoteId": quote_id, "mode": mode, "modelId": model_id, "text": text,
            "attachmentIds": canonical_attachment_ids(attachment_ids), "parentId": str(parent_id) if parent_id else None,
            "options": options or {},
        },
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def compare_payload_hash(*, chat_id: str, mode: str, text: str, routes, attachment_ids=(), parent_id=None, options: dict | None = None) -> str:
    """Bind an idempotency key to the exact ordered set of explicitly chosen routes."""
    canonical = json.dumps(
        {
            "chatId": chat_id,
            "mode": mode,
            "text": text,
            "routes": [{"modelId": route["modelId"], "quoteId": str(route["quoteId"])} for route in routes],
            "attachmentIds": canonical_attachment_ids(attachment_ids),
            "parentId": str(parent_id) if parent_id else None,
            "options": options or {},
        },
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
