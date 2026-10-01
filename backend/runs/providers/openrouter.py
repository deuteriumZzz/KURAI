import json
from base64 import b64decode
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Iterator
from urllib.parse import urlparse
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings


class OpenRouterProviderError(RuntimeError):
    pass


@dataclass(frozen=True)
class CompletionChunk:
    text: str = ""
    model_id: str | None = None
    cost_usd: Decimal | None = None
    provider_request_id: str | None = None
    citations: tuple["ResearchCitation", ...] = ()


@dataclass(frozen=True)
class ResearchCitation:
    """Provider citation kept as data, never treated as markup."""

    url: str
    title: str
    excerpt: str = ""


@dataclass(frozen=True)
class ImageGeneration:
    data: bytes
    content_type: str
    model_id: str | None = None
    cost_usd: Decimal | None = None
    provider_request_id: str | None = None


@dataclass(frozen=True)
class AudioGeneration:
    data: bytes
    content_type: str
    model_id: str | None = None
    provider_request_id: str | None = None


@dataclass(frozen=True)
class VideoGeneration:
    job_id: str


@dataclass(frozen=True)
class VideoGenerationStatus:
    status: str
    model_id: str | None = None
    cost_usd: Decimal | None = None
    error_code: str | None = None


def decimal_or_none(value) -> Decimal | None:
    if value is None:
        return None
    try:
        parsed = Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None
    return parsed if parsed.is_finite() else None


def citations_from_annotations(*annotation_groups: object) -> tuple[ResearchCitation, ...]:
    """Accept only OpenRouter URL citations with a browser-safe absolute URL."""
    raw_citations: list[ResearchCitation] = []
    for group in annotation_groups:
        if not isinstance(group, list):
            continue
        for annotation in group:
            if not isinstance(annotation, dict) or annotation.get("type") != "url_citation":
                continue
            url = annotation.get("url")
            if not isinstance(url, str):
                continue
            parsed = urlparse(url)
            raw_title = annotation.get("title")
            title = raw_title.strip()[:300] if isinstance(raw_title, str) and raw_title.strip() else parsed.netloc[:300]
            raw_excerpt = annotation.get("content")
            excerpt = raw_excerpt.strip()[:4000] if isinstance(raw_excerpt, str) else ""
            raw_citations.append(ResearchCitation(url=url, title=title, excerpt=excerpt))
    return sanitise_citations(raw_citations)


def sanitise_citations(citations) -> tuple[ResearchCitation, ...]:
    """Defence in depth: no provider adapter can persist a dangerous citation URL."""
    accepted: list[ResearchCitation] = []
    seen: set[str] = set()
    for citation in citations:
        if not isinstance(citation, ResearchCitation) or len(citation.url) > 2048 or citation.url in seen:
            continue
        parsed = urlparse(citation.url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password:
            continue
        title = citation.title.strip()[:300] or parsed.netloc[:300]
        accepted.append(ResearchCitation(url=citation.url, title=title, excerpt=citation.excerpt.strip()[:4000]))
        seen.add(citation.url)
    return tuple(accepted)


def stream_openrouter_completion(
    *, model_id: str, prompt: str, user_id: str, session_id: str, research: bool = False,
    search_uses: int | None = None, reasoning: bool = False, max_tokens: int | None = None,
) -> Iterator[CompletionChunk]:
    if not settings.OPENROUTER_API_KEY:
        raise OpenRouterProviderError("OpenRouter is not configured")
    body = {
        "model": model_id,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens or settings.KURAI_MAX_COMPLETION_TOKENS,
        "stream": True,
        "stream_options": {"include_usage": True},
        "usage": {"include": True},
        "user": user_id,
        "session_id": session_id,
    }
    if reasoning:
        # «Думать дольше»: единый параметр рассуждения OpenRouter; бюджет ограничен max_tokens выше.
        body["reasoning"] = {"effort": "high"}
    if research:
        uses = search_uses or settings.KURAI_RESEARCH_MAX_USES
        body["tools"] = [{
            "type": "openrouter:web_search",
            "parameters": {
                "engine": settings.KURAI_RESEARCH_SEARCH_ENGINE,
                "max_results": settings.KURAI_RESEARCH_MAX_RESULTS,
                "max_total_results": settings.KURAI_RESEARCH_MAX_TOTAL_RESULTS,
                "max_uses": uses,
                "max_characters": settings.KURAI_RESEARCH_MAX_SOURCE_CHARACTERS,
            },
        }]
        body["max_tool_calls"] = max(settings.KURAI_RESEARCH_MAX_TOOL_CALLS, uses + 1)
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "X-OpenRouter-Metadata": "enabled",
        "X-OpenRouter-Title": settings.OPENROUTER_APP_NAME,
    }
    if settings.OPENROUTER_SITE_URL:
        headers["HTTP-Referer"] = settings.OPENROUTER_SITE_URL
    request = Request(
        f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        response = urlopen(request, timeout=120)
    except (HTTPError, URLError, TimeoutError) as error:
        raise OpenRouterProviderError("OpenRouter request failed") from error
    try:
        for raw_line in response:
            line = raw_line.decode("utf-8").strip()
            if not line.startswith("data:"):
                continue
            raw_data = line[5:].strip()
            if raw_data == "[DONE]":
                return
            try:
                payload = json.loads(raw_data)
            except json.JSONDecodeError:
                continue
            choice = (payload.get("choices") or [{}])[0]
            delta = choice.get("delta") or {}
            content = delta.get("content")
            if isinstance(content, list):
                content = "".join(part.get("text", "") for part in content if isinstance(part, dict))
            usage = payload.get("usage") if isinstance(payload.get("usage"), dict) else {}
            yield CompletionChunk(
                text=content if isinstance(content, str) else "",
                model_id=payload.get("model") if isinstance(payload.get("model"), str) else None,
                cost_usd=decimal_or_none(usage.get("cost")),
                provider_request_id=payload.get("id") if isinstance(payload.get("id"), str) else None,
                citations=citations_from_annotations(
                    delta.get("annotations"),
                    choice.get("annotations"),
                    (choice.get("message") or {}).get("annotations") if isinstance(choice.get("message"), dict) else None,
                    payload.get("annotations"),
                ),
            )
    except (HTTPError, URLError, TimeoutError, UnicodeDecodeError) as error:
        raise OpenRouterProviderError("OpenRouter stream failed") from error
    finally:
        response.close()


def generate_openrouter_image(*, model_id: str, prompt: str, user_id: str) -> ImageGeneration:
    """Request one image and retain bytes server-side; no provider URL reaches the browser."""
    if not settings.OPENROUTER_API_KEY:
        raise OpenRouterProviderError("OpenRouter is not configured")
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-OpenRouter-Metadata": "enabled",
        "X-OpenRouter-Title": settings.OPENROUTER_APP_NAME,
    }
    if settings.OPENROUTER_SITE_URL:
        headers["HTTP-Referer"] = settings.OPENROUTER_SITE_URL
    body = {"model": model_id, "prompt": prompt, "n": 1, "user": user_id}
    request = Request(
        f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/images",
        data=json.dumps(body).encode("utf-8"), headers=headers, method="POST",
    )
    try:
        with urlopen(request, timeout=150) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise OpenRouterProviderError("OpenRouter image request failed") from error
    items = payload.get("data")
    item = items[0] if isinstance(items, list) and items and isinstance(items[0], dict) else None
    encoded = item.get("b64_json") if item else None
    if not isinstance(encoded, str):
        raise OpenRouterProviderError("OpenRouter image payload was invalid")
    try:
        image_data = b64decode(encoded, validate=True)
    except ValueError as error:
        raise OpenRouterProviderError("OpenRouter image payload was invalid") from error
    if not image_data or len(image_data) > 25 * 1024 * 1024:
        raise OpenRouterProviderError("OpenRouter image size was invalid")
    content_type = item.get("content_type") if isinstance(item.get("content_type"), str) else "image/png"
    if content_type not in {"image/png", "image/jpeg", "image/webp"}:
        raise OpenRouterProviderError("OpenRouter image type was invalid")
    usage = payload.get("usage") if isinstance(payload.get("usage"), dict) else {}
    return ImageGeneration(
        data=image_data,
        content_type=content_type,
        model_id=payload.get("model") if isinstance(payload.get("model"), str) else None,
        cost_usd=decimal_or_none(usage.get("cost")),
        provider_request_id=payload.get("id") if isinstance(payload.get("id"), str) else None,
    )


def generate_openrouter_audio(*, model_id: str, text: str, user_id: str) -> AudioGeneration:
    """Synthesize a private MP3. The provider's raw stream is never exposed to a browser."""
    if not settings.OPENROUTER_API_KEY:
        raise OpenRouterProviderError("OpenRouter is not configured")
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
        "X-OpenRouter-Metadata": "enabled",
        "X-OpenRouter-Title": settings.OPENROUTER_APP_NAME,
    }
    if settings.OPENROUTER_SITE_URL:
        headers["HTTP-Referer"] = settings.OPENROUTER_SITE_URL
    body = {"model": model_id, "input": text, "response_format": "mp3", "user": user_id}
    request = Request(
        f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/audio/speech",
        data=json.dumps(body).encode("utf-8"), headers=headers, method="POST",
    )
    try:
        with urlopen(request, timeout=150) as response:
            content_type = response.headers.get_content_type()
            audio_data = response.read(settings.KURAI_MEDIA_MAX_AUDIO_BYTES + 1)
            generation_id = response.headers.get("X-Generation-Id")
    except (HTTPError, URLError, TimeoutError, UnicodeDecodeError) as error:
        raise OpenRouterProviderError("OpenRouter audio request failed") from error
    if content_type not in {"audio/mpeg", "audio/mp3"} or not audio_data or len(audio_data) > settings.KURAI_MEDIA_MAX_AUDIO_BYTES:
        raise OpenRouterProviderError("OpenRouter audio payload was invalid")
    return AudioGeneration(
        data=audio_data,
        content_type="audio/mpeg",
        model_id=model_id,
        provider_request_id=generation_id[:160] if isinstance(generation_id, str) else None,
    )


def submit_openrouter_video(*, model_id: str, prompt: str, user_id: str, duration: int | None = None) -> VideoGeneration:
    """Submit an asynchronous video job. Completion must be polled in a worker task."""
    if not settings.OPENROUTER_API_KEY:
        raise OpenRouterProviderError("OpenRouter is not configured")
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-OpenRouter-Metadata": "enabled",
        "X-OpenRouter-Title": settings.OPENROUTER_APP_NAME,
    }
    if settings.OPENROUTER_SITE_URL:
        headers["HTTP-Referer"] = settings.OPENROUTER_SITE_URL
    body = {"model": model_id, "prompt": prompt, "duration": duration or settings.KURAI_VIDEO_DEFAULT_DURATION_SECONDS, "user": user_id}
    request = Request(
        f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/videos",
        data=json.dumps(body).encode("utf-8"), headers=headers, method="POST",
    )
    try:
        with urlopen(request, timeout=60) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise OpenRouterProviderError("OpenRouter video request failed") from error
    job_id = payload.get("id") if isinstance(payload, dict) else None
    if not isinstance(job_id, str) or not job_id or len(job_id) > 160:
        raise OpenRouterProviderError("OpenRouter video payload was invalid")
    return VideoGeneration(job_id=job_id)


def get_openrouter_video(*, job_id: str) -> VideoGenerationStatus:
    if not settings.OPENROUTER_API_KEY or not job_id:
        raise OpenRouterProviderError("OpenRouter is not configured")
    request = Request(
        f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/videos/{job_id}",
        headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}", "Accept": "application/json"}, method="GET",
    )
    try:
        with urlopen(request, timeout=60) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise OpenRouterProviderError("OpenRouter video polling failed") from error
    if not isinstance(payload, dict):
        raise OpenRouterProviderError("OpenRouter video status was invalid")
    state = payload.get("status")
    if state not in {"pending", "in_progress", "completed", "failed", "cancelled", "expired"}:
        raise OpenRouterProviderError("OpenRouter video status was invalid")
    usage = payload.get("usage") if isinstance(payload.get("usage"), dict) else {}
    return VideoGenerationStatus(
        status=state,
        model_id=payload.get("model") if isinstance(payload.get("model"), str) else None,
        cost_usd=decimal_or_none(usage.get("cost")),
        error_code=payload.get("error")[:80] if isinstance(payload.get("error"), str) else None,
    )


def download_openrouter_video(*, job_id: str) -> tuple[bytes, str]:
    """Download only from OpenRouter's documented content endpoint, never a provider-supplied URL."""
    if not settings.OPENROUTER_API_KEY or not job_id:
        raise OpenRouterProviderError("OpenRouter is not configured")
    request = Request(
        f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/videos/{job_id}/content?index=0",
        headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}", "Accept": "video/*"}, method="GET",
    )
    try:
        with urlopen(request, timeout=180) as response:
            content_type = response.headers.get_content_type()
            video_data = response.read(settings.KURAI_MEDIA_MAX_VIDEO_BYTES + 1)
    except (HTTPError, URLError, TimeoutError, UnicodeDecodeError) as error:
        raise OpenRouterProviderError("OpenRouter video download failed") from error
    if content_type not in {"video/mp4", "video/webm"} or not video_data or len(video_data) > settings.KURAI_MEDIA_MAX_VIDEO_BYTES:
        raise OpenRouterProviderError("OpenRouter video payload was invalid")
    return video_data, content_type
