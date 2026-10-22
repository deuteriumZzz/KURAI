import threading
from decimal import Decimal, ROUND_CEILING

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import connection, transaction
from django.utils import timezone

from ledger.services import consume_hold, release_hold
from runs.events import append_event
from runs.models import Run, RunAttempt, RunEvent, RunSource
from runs.options import completion_tokens, prompt_directives, search_uses
from runs.services import append_run_notice, video_seconds
from media.models import GeneratedAsset
from model_catalog.models import CatalogModel
from runs.providers.openrouter import (
    OpenRouterProviderError,
    download_openrouter_video,
    generate_openrouter_audio,
    generate_openrouter_image,
    get_openrouter_video,
    sanitise_citations,
    stream_openrouter_completion,
    submit_openrouter_video,
)


MEDIA_MODES = {"image", "video", "audio"}


def video_request(model_id: str, options: dict) -> dict:
    """Clip length, resolution and frame exactly as the quote priced them; a model gone from the catalog keeps the asked length."""
    model = CatalogModel.objects.filter(id=model_id).first()
    spec = model.media_spec if model else {}
    aspect = options.get("aspect")
    return {
        "duration": video_seconds(model, options) if model else options.get("duration", settings.KURAI_VIDEO_DEFAULT_DURATION_SECONDS),
        "resolution": spec.get("resolution"),
        "aspect_ratio": aspect if aspect in (spec.get("aspects") or ()) else None,
    }


def local_text_result(prompt: str) -> str:
    return "Рабочий план\n\n1. Зафиксировать цель и метрику результата.\n2. Собрать факты и риски.\n3. Подготовить первое действие и критерий проверки.\n\nКонтекст: " + prompt[:500]


def prompt_with_attachment_context(run_id: str, prompt: str) -> str:
    """Provide small text files as context without sending binary or unbounded data upstream."""
    from runs.models import RunAttachment

    excerpts: list[str] = []
    remaining = 30_000
    attachments = RunAttachment.objects.filter(run_id=run_id, file__content_type__in=("text/plain", "text/markdown"), file__size_bytes__lte=1_000_000).select_related("file")
    for attachment in attachments:
        if remaining <= 0:
            break
        try:
            with attachment.file.file.open("rb") as source:
                text = source.read(min(10_000, remaining)).decode("utf-8", errors="replace").replace("\x00", "")
        except OSError:
            continue
        if text.strip():
            excerpts.append(f"[Файл: {attachment.file.original_name}]\n{text}")
            remaining -= len(text)
    return prompt if not excerpts else f"{prompt}\n\nКонтекст из прикреплённых файлов:\n" + "\n\n".join(excerpts)


def micro_from_usd(cost_usd: Decimal | None, fallback: int) -> int:
    if cost_usd is None:
        return fallback
    return max(0, int((cost_usd * settings.KURAI_CREDITS_PER_USD).to_integral_value(rounding=ROUND_CEILING)))


def finalize_cancellation(run_id: str, attempt_id=None) -> bool:
    """Turn a requested cancellation into one terminal, refundable state.

    A running provider request may still finish remotely, so the worker is the
    only place that finalises it. This prevents a released hold from being
    silently charged by a late completion path.
    """
    with transaction.atomic():
        run = Run.objects.select_for_update().select_related("hold", "output_message").filter(id=run_id).first()
        if run is None or run.status != Run.Status.CANCEL_REQUESTED:
            return False
        attempt = RunAttempt.objects.select_for_update().filter(id=attempt_id, run=run).first() if attempt_id else None
        if attempt is None:
            attempt = RunAttempt.objects.select_for_update().filter(run=run, status=RunAttempt.Status.RUNNING).first()
        if attempt is not None:
            attempt.status = RunAttempt.Status.CANCELED
            attempt.error_code = "canceled_by_user"
            attempt.completed_at = timezone.now()
            attempt.save(update_fields=("status", "error_code", "completed_at"))
        release_hold(run.hold)
        run.status = Run.Status.CANCELED
        run.save(update_fields=("status", "updated_at"))
        if run.mode in MEDIA_MODES and run.output_message_id:
            run.output_message.parts = [{"type": "job", "jobId": str(run.id), "kind": run.mode, "status": "canceled", "progress": 0}]
            run.output_message.save(update_fields=("parts",))
        elif run.output_message_id:
            append_run_notice(run.output_message, "Генерация остановлена, резерв кредитов освобождён")
        append_event(run, RunEvent.Type.CANCELED, {"status": Run.Status.CANCELED})
    return True


def fail_run(run_id: str, attempt_id, code: str) -> None:
    if Run.objects.filter(id=run_id, status=Run.Status.CANCEL_REQUESTED).exists():
        finalize_cancellation(run_id, attempt_id)
        return
    with transaction.atomic():
        run = Run.objects.select_for_update().select_related("hold", "output_message").filter(id=run_id).first()
        attempt = RunAttempt.objects.select_for_update().filter(id=attempt_id).first()
        if attempt is not None:
            attempt.status = RunAttempt.Status.FAILED
            attempt.error_code = code
            attempt.completed_at = timezone.now()
            attempt.save(update_fields=("status", "error_code", "completed_at"))
        if run is not None and run.status == Run.Status.RUNNING:
            release_hold(run.hold)
            run.status = Run.Status.FAILED
            run.save(update_fields=("status", "updated_at"))
            if run.mode in MEDIA_MODES and run.output_message_id:
                run.output_message.parts = [{"type": "job", "jobId": str(run.id), "kind": run.mode, "status": "failed", "progress": 0}]
                run.output_message.save(update_fields=("parts",))
            append_event(run, RunEvent.Type.ERROR, {"status": Run.Status.FAILED, "code": code})


def start_run(run_id: str):
    with transaction.atomic():
        run = Run.objects.select_for_update().select_related("input_message", "output_message", "quote").filter(id=run_id).first()
        if run is None or run.status != Run.Status.QUEUED:
            return None
        provider = "openrouter" if settings.OPENROUTER_API_KEY else "local"
        attempt = RunAttempt.objects.create(run=run, provider=provider, requested_model=run.quote.resolved_model)
        run.status = Run.Status.RUNNING
        run.save(update_fields=("status", "updated_at"))
        if run.mode in MEDIA_MODES:
            run.output_message.parts = [{"type": "job", "jobId": str(run.id), "kind": run.mode, "status": "running", "progress": 0.2}]
            run.output_message.save(update_fields=("parts",))
        append_event(run, RunEvent.Type.ROUTED, {"provider": provider, "model": run.quote.resolved_model})
        return prompt_with_attachment_context(str(run.id), run.input_message.text), run.quote.resolved_model, str(run.user_id), str(run.chat_id), run.mode, attempt.id


def persist_delta(run_id: str, text: str) -> bool:
    if not text:
        return True
    with transaction.atomic():
        run = Run.objects.select_for_update().select_related("output_message").filter(id=run_id).first()
        if run is None or run.status != Run.Status.RUNNING:
            return False
        current = run.output_message.text
        next_text = current + text
        run.output_message.text = next_text
        source_parts = [part for part in run.output_message.parts if isinstance(part, dict) and part.get("type") == "sources"]
        run.output_message.parts = [{"type": "text", "text": next_text}, *source_parts]
        run.output_message.save(update_fields=("text", "parts"))
        append_event(run, RunEvent.Type.DELTA, {"text": text})
    return True


def source_item(source) -> dict:
    """Browser-safe citation: URL, title, a short plain-text quote (never HTML) and when it was read."""
    quote = " ".join(source.excerpt.split())[:280]
    return {"url": source.url, "title": source.title, **({"quote": quote} if quote else {}), "readAt": source.created_at.isoformat()}


def persist_research_sources(run_id: str, citations) -> None:
    """Persist provider citations and emit only safe URL/title/quote data to the browser."""
    citations = sanitise_citations(citations)
    if not citations:
        return
    with transaction.atomic():
        run = Run.objects.select_for_update().select_related("output_message").filter(id=run_id, status=Run.Status.RUNNING).first()
        if run is None or run.output_message_id is None:
            return
        existing = {source.url for source in RunSource.objects.filter(run=run).only("url")}
        position = RunSource.objects.filter(run=run).count()
        created = []
        for citation in citations:
            if citation.url in existing:
                continue
            source = RunSource.objects.create(
                run=run,
                message=run.output_message,
                position=position,
                url=citation.url,
                title=citation.title,
                excerpt=citation.excerpt,
            )
            position += 1
            existing.add(source.url)
            created.append(source)
        if not created:
            return
        sources = RunSource.objects.filter(run=run).order_by("position")
        current_parts = [part for part in run.output_message.parts if not (isinstance(part, dict) and part.get("type") == "sources")]
        run.output_message.parts = [*current_parts, {"type": "sources", "items": [source_item(source) for source in sources]}]
        run.output_message.save(update_fields=("parts",))
        for source in created:
            append_event(run, RunEvent.Type.SOURCE, source_item(source))


def complete_run(run_id: str, attempt_id, resolved_model: str, provider_request_id: str, cost_usd: Decimal | None) -> None:
    should_cancel = False
    with transaction.atomic():
        run = Run.objects.select_for_update().select_related("output_message", "hold").filter(id=run_id).first()
        attempt = RunAttempt.objects.select_for_update().filter(id=attempt_id).first()
        if run is None or attempt is None:
            return
        if run.status == Run.Status.CANCEL_REQUESTED:
            should_cancel = True
        elif run.status != Run.Status.RUNNING:
            return
        if not should_cancel:
            billed_micro = micro_from_usd(cost_usd, run.estimated_cost_micro)
            if billed_micro > run.hold.reserved_micro:
                # The quote is a hard pre-authorisation ceiling. Do not make an un-auditable overdraft.
                release_hold(run.hold)
                run.status = Run.Status.FAILED
                run.save(update_fields=("status", "updated_at"))
                attempt.status = RunAttempt.Status.FAILED
                attempt.error_code = "cost_exceeded_quote"
                attempt.completed_at = timezone.now()
                attempt.save(update_fields=("status", "error_code", "completed_at"))
                append_event(run, RunEvent.Type.ERROR, {"status": Run.Status.FAILED, "code": "cost_exceeded_quote"})
                return
            if not run.output_message.text:
                release_hold(run.hold)
                run.status = Run.Status.FAILED
                run.save(update_fields=("status", "updated_at"))
                attempt.status = RunAttempt.Status.FAILED
                attempt.error_code = "empty_provider_response"
                attempt.completed_at = timezone.now()
                attempt.save(update_fields=("status", "error_code", "completed_at"))
                append_event(run, RunEvent.Type.ERROR, {"status": Run.Status.FAILED, "code": "empty_provider_response"})
                return
            run.output_message.resolved_model = resolved_model
            run.output_message.save(update_fields=("resolved_model",))
            if billed_micro:
                consume_hold(run.hold, billed_micro)
            else:
                release_hold(run.hold)
            attempt.status = RunAttempt.Status.COMPLETED
            attempt.resolved_model = resolved_model
            attempt.provider_request_id = provider_request_id[:160]
            attempt.billed_cost_micro = billed_micro
            attempt.completed_at = timezone.now()
            attempt.save(update_fields=("status", "resolved_model", "provider_request_id", "billed_cost_micro", "completed_at"))
            run.status = Run.Status.COMPLETED
            run.save(update_fields=("status", "updated_at"))
            append_event(run, RunEvent.Type.DONE, {"status": Run.Status.COMPLETED, "costMicro": billed_micro, "model": resolved_model})
    if should_cancel:
        finalize_cancellation(run_id, attempt_id)


def complete_image_run(run_id: str, attempt_id, *, images) -> None:
    """Store every generated image before settling the hold, leaving an auditable immutable result."""
    extensions = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
    should_cancel = False
    with transaction.atomic():
        run = Run.objects.select_for_update().select_related("output_message", "hold", "quote").filter(id=run_id).first()
        attempt = RunAttempt.objects.select_for_update().filter(id=attempt_id).first()
        if run is None or attempt is None:
            return
        if run.status == Run.Status.CANCEL_REQUESTED:
            should_cancel = True
        elif run.status != Run.Status.RUNNING:
            return
        if not should_cancel:
            # Actual cost is known only when the provider reported it for every image.
            costs = [image.cost_usd for image in images]
            billed_micro = micro_from_usd(sum(costs, Decimal(0)) if all(cost is not None for cost in costs) else None, run.estimated_cost_micro)
            if billed_micro > run.hold.reserved_micro:
                release_hold(run.hold)
                run.status = Run.Status.FAILED
                run.save(update_fields=("status", "updated_at"))
                attempt.status = RunAttempt.Status.FAILED
                attempt.error_code = "cost_exceeded_quote"
                attempt.completed_at = timezone.now()
                attempt.save(update_fields=("status", "error_code", "completed_at"))
                append_event(run, RunEvent.Type.ERROR, {"status": Run.Status.FAILED, "code": "cost_exceeded_quote"})
                return
            resolved_model = images[0].model_id or run.quote.resolved_model
            share = billed_micro // len(images)
            assets = []
            for position, image in enumerate(images):
                assets.append(GeneratedAsset.objects.create(
                    owner=run.user,
                    run=run,
                    message=run.output_message,
                    kind=GeneratedAsset.Kind.IMAGE,
                    file=ContentFile(image.data, name=f"image.{extensions[image.content_type]}"),
                    content_type=image.content_type,
                    size_bytes=len(image.data),
                    prompt=run.input_message.text,
                    requested_model=run.quote.resolved_model,
                    resolved_model=image.model_id or resolved_model,
                    # остаток от деления — у первого файла, чтобы сумма по файлам совпала со списанием
                    cost_micro=share + (billed_micro - share * len(images) if position == 0 else 0),
                ))
            run.output_message.text = "Изображение готово." if len(assets) == 1 else f"Готово изображений: {len(assets)}."
            run.output_message.parts = [{
                "type": "image", "assetId": str(asset.id), "url": f"/api/v1/media/{asset.id}/download",
                "alt": run.input_message.text[:280], "width": 0, "height": 0,
            } for asset in assets]
            run.output_message.resolved_model = resolved_model
            run.output_message.save(update_fields=("text", "parts", "resolved_model"))
            if billed_micro:
                consume_hold(run.hold, billed_micro)
            else:
                release_hold(run.hold)
            attempt.status = RunAttempt.Status.COMPLETED
            attempt.resolved_model = resolved_model
            attempt.provider_request_id = ",".join(image.provider_request_id or "" for image in images)[:160]
            attempt.billed_cost_micro = billed_micro
            attempt.completed_at = timezone.now()
            attempt.save(update_fields=("status", "resolved_model", "provider_request_id", "billed_cost_micro", "completed_at"))
            run.status = Run.Status.COMPLETED
            run.save(update_fields=("status", "updated_at"))
            for asset in assets:
                append_event(run, RunEvent.Type.MEDIA, {"assetId": str(asset.id), "url": f"/api/v1/media/{asset.id}/download"})
            append_event(run, RunEvent.Type.DONE, {"status": Run.Status.COMPLETED, "costMicro": billed_micro, "model": resolved_model})
    if should_cancel:
        finalize_cancellation(run_id, attempt_id)


def complete_binary_media_run(
    run_id: str,
    attempt_id,
    *,
    kind: str,
    data: bytes,
    content_type: str,
    resolved_model: str,
    provider_request_id: str,
    cost_usd: Decimal | None,
) -> None:
    """Persist audio or video before ledger settlement; browser sees only an owner-scoped KURAI URL."""
    extensions = {
        ("audio", "audio/mpeg"): "mp3",
        ("video", "video/mp4"): "mp4",
        ("video", "video/webm"): "webm",
    }
    extension = extensions.get((kind, content_type))
    if extension is None:
        fail_run(run_id, attempt_id, "invalid_media_payload")
        return
    should_cancel = False
    with transaction.atomic():
        run = Run.objects.select_for_update().select_related("output_message", "hold", "quote", "input_message").filter(id=run_id).first()
        attempt = RunAttempt.objects.select_for_update().filter(id=attempt_id, run_id=run_id).first()
        if run is None or attempt is None:
            return
        if run.status == Run.Status.CANCEL_REQUESTED:
            should_cancel = True
        elif run.status != Run.Status.RUNNING:
            return
        if not should_cancel:
            billed_micro = micro_from_usd(cost_usd, run.estimated_cost_micro)
            if billed_micro > run.hold.reserved_micro:
                release_hold(run.hold)
                run.status = Run.Status.FAILED
                run.save(update_fields=("status", "updated_at"))
                attempt.status = RunAttempt.Status.FAILED
                attempt.error_code = "cost_exceeded_quote"
                attempt.completed_at = timezone.now()
                attempt.save(update_fields=("status", "error_code", "completed_at"))
                append_event(run, RunEvent.Type.ERROR, {"status": Run.Status.FAILED, "code": "cost_exceeded_quote"})
                return
            asset = GeneratedAsset.objects.create(
                owner=run.user,
                run=run,
                message=run.output_message,
                kind=kind,
                file=ContentFile(data, name=f"{kind}.{extension}"),
                content_type=content_type,
                size_bytes=len(data),
                prompt=run.input_message.text,
                requested_model=run.quote.resolved_model,
                resolved_model=resolved_model,
                cost_micro=billed_micro,
            )
            url = f"/api/v1/media/{asset.id}/download"
            if kind == "audio":
                parts = [{"type": "audio", "assetId": str(asset.id), "url": url}]
                text = "Аудио готово."
            else:
                duration = video_request(run.quote.resolved_model, run.quote.options or {})["duration"]
                parts = [{"type": "video", "assetId": str(asset.id), "url": url, "durationSec": duration}]
                text = "Видео готово."
            run.output_message.text = text
            run.output_message.parts = parts
            run.output_message.resolved_model = resolved_model
            run.output_message.save(update_fields=("text", "parts", "resolved_model"))
            if billed_micro:
                consume_hold(run.hold, billed_micro)
            else:
                release_hold(run.hold)
            attempt.status = RunAttempt.Status.COMPLETED
            attempt.resolved_model = resolved_model
            attempt.provider_request_id = provider_request_id[:160]
            attempt.billed_cost_micro = billed_micro
            attempt.completed_at = timezone.now()
            attempt.save(update_fields=("status", "resolved_model", "provider_request_id", "billed_cost_micro", "completed_at"))
            run.status = Run.Status.COMPLETED
            run.save(update_fields=("status", "updated_at"))
            append_event(run, RunEvent.Type.MEDIA, {"assetId": str(asset.id), "url": url})
            append_event(run, RunEvent.Type.DONE, {"status": Run.Status.COMPLETED, "costMicro": billed_micro, "model": resolved_model})
    if should_cancel:
        finalize_cancellation(run_id, attempt_id)


def schedule_video_poll(run_id: str, attempt_id: str) -> None:
    """Keep an async provider job off the request path and out of a long-lived worker process."""
    from runs.tasks import poll_video_run_task

    if settings.KURAI_QUEUE_RUNS:
        poll_video_run_task.apply_async(args=[run_id, attempt_id], countdown=settings.KURAI_VIDEO_POLL_SECONDS)
    elif settings.KURAI_LOCAL_EXECUTE_RUNS:
        # ponytail: локальная разработка без Celery — таймер на каждый шаг опроса; в проде шаги идут через очередь выше
        timer = threading.Timer(settings.KURAI_VIDEO_POLL_SECONDS, poll_video_locally, args=(run_id, attempt_id))
        timer.daemon = True
        timer.start()


def poll_video_locally(run_id: str, attempt_id: str) -> None:
    try:
        poll_video_run(run_id, attempt_id)
    finally:
        connection.close()


def poll_video_run(run_id: str, attempt_id: str) -> None:
    """Advance one durable OpenRouter video job state; safe to redeliver or invoke after a restart."""
    run = Run.objects.select_related("output_message").filter(id=run_id).first()
    attempt = RunAttempt.objects.filter(id=attempt_id, run_id=run_id).first()
    if run is None or attempt is None or attempt.status != RunAttempt.Status.RUNNING:
        return
    if run.status == Run.Status.CANCEL_REQUESTED:
        finalize_cancellation(run_id, attempt_id)
        return
    if run.status != Run.Status.RUNNING or not attempt.provider_request_id:
        return
    try:
        provider_status = get_openrouter_video(job_id=attempt.provider_request_id)
    except OpenRouterProviderError:
        fail_run(run_id, attempt_id, "provider_unavailable")
        return
    if provider_status.status in {"pending", "in_progress"}:
        append_event(run, RunEvent.Type.ROUTED, {"provider": "openrouter", "model": attempt.requested_model})
        schedule_video_poll(run_id, str(attempt.id))
        return
    if provider_status.status != "completed":
        fail_run(run_id, attempt_id, provider_status.error_code or "provider_video_failed")
        return
    try:
        data, content_type = download_openrouter_video(job_id=attempt.provider_request_id)
    except OpenRouterProviderError:
        fail_run(run_id, attempt_id, "provider_video_download_failed")
        return
    complete_binary_media_run(
        run_id,
        attempt_id,
        kind="video",
        data=data,
        content_type=content_type,
        resolved_model=provider_status.model_id or attempt.requested_model,
        provider_request_id=attempt.provider_request_id,
        cost_usd=provider_status.cost_usd,
    )


def process_run(run_id: str) -> None:
    """Execute an idempotent run in a worker, streaming provider deltas into durable events."""
    started = start_run(run_id)
    if started is None:
        return
    prompt, model_id, user_id, chat_id, mode, attempt_id = started
    # Options come only from the quote the run was launched with (bound by request_hash).
    options = Run.objects.filter(id=run_id).values_list("quote__options", flat=True).first() or {}
    directives = prompt_directives(mode, options)
    if directives:
        prompt = f"{prompt}\n\n{directives}"
    if mode == "image":
        if not settings.OPENROUTER_API_KEY:
            fail_run(run_id, attempt_id, "provider_unavailable")
            return
        images = []
        try:
            # one request per image: «n» support differs between image models
            for _ in range(options.get("count", 1)):
                images.append(generate_openrouter_image(model_id=model_id, prompt=prompt, user_id=user_id))
        except OpenRouterProviderError:
            fail_run(run_id, attempt_id, "provider_unavailable")
            return
        complete_image_run(run_id, attempt_id, images=images)
        return
    if mode == "audio":
        if not settings.OPENROUTER_API_KEY:
            fail_run(run_id, attempt_id, "provider_unavailable")
            return
        try:
            voices = CatalogModel.objects.filter(id=model_id).values_list("media_spec", flat=True).first() or {}
            # ponytail: голос — первый объявленный моделью; выбор голоса в интерфейсе — когда появится его UI
            audio = generate_openrouter_audio(model_id=model_id, text=prompt, user_id=user_id, voice=next(iter(voices.get("voices") or ()), None))
        except OpenRouterProviderError:
            fail_run(run_id, attempt_id, "provider_unavailable")
            return
        complete_binary_media_run(
            run_id,
            attempt_id,
            kind="audio",
            data=audio.data,
            content_type=audio.content_type,
            resolved_model=audio.model_id or model_id,
            provider_request_id=audio.provider_request_id or "",
            cost_usd=None,
        )
        return
    if mode == "video":
        if not settings.OPENROUTER_API_KEY:
            fail_run(run_id, attempt_id, "provider_unavailable")
            return
        try:
            video = submit_openrouter_video(model_id=model_id, prompt=prompt, user_id=user_id, **video_request(model_id, options))
        except OpenRouterProviderError:
            fail_run(run_id, attempt_id, "provider_unavailable")
            return
        with transaction.atomic():
            attempt = RunAttempt.objects.select_for_update().filter(id=attempt_id, run_id=run_id, status=RunAttempt.Status.RUNNING).first()
            run = Run.objects.select_for_update().filter(id=run_id).first()
            if attempt is None or run is None:
                return
            if run.status == Run.Status.CANCEL_REQUESTED:
                # OpenRouter currently exposes no documented cancellation endpoint;
                # stop local delivery and release the hold rather than polling forever.
                pass
            else:
                attempt.provider_request_id = video.job_id
                attempt.save(update_fields=("provider_request_id",))
                append_event(run, RunEvent.Type.ROUTED, {"provider": "openrouter", "model": model_id})
                schedule_video_poll(run_id, str(attempt.id))
                return
        finalize_cancellation(run_id, attempt_id)
        return
    if not settings.OPENROUTER_API_KEY:
        try:
            result = local_text_result(prompt)
        except Exception:
            fail_run(run_id, attempt_id, "provider_unavailable")
            return
        if persist_delta(run_id, result):
            complete_run(run_id, attempt_id, "local-text", "", None)
        else:
            finalize_cancellation(run_id, attempt_id)
        return

    resolved_model = model_id
    request_id = ""
    billed_cost_usd: Decimal | None = None
    # Project rules travel as a system message, never mixed into the user's own text.
    instructions = Run.objects.filter(id=run_id).values_list("chat__project__instructions", flat=True).first() or ""
    try:
        uses = search_uses(mode, options)
        for chunk in stream_openrouter_completion(
            model_id=model_id, prompt=prompt, user_id=user_id, session_id=chat_id, system=instructions or None,
            research=uses > 0, search_uses=uses or None, reasoning=bool(options.get("think")), max_tokens=completion_tokens(options),
        ):
            if chunk.model_id:
                resolved_model = chunk.model_id
            if chunk.provider_request_id:
                request_id = chunk.provider_request_id
            if chunk.cost_usd is not None:
                billed_cost_usd = chunk.cost_usd
            persist_research_sources(run_id, chunk.citations)
            if chunk.text and not persist_delta(run_id, chunk.text):
                finalize_cancellation(run_id, attempt_id)
                return
    except OpenRouterProviderError:
        fail_run(run_id, attempt_id, "provider_unavailable")
        return
    complete_run(run_id, attempt_id, resolved_model, request_id, billed_cost_usd)
