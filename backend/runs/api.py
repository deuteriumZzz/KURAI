import json
import time
import uuid

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.http import StreamingHttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.response import Response

from kurai.api import KuraiAPIView, SUPPORTED_RUN_MODES
from files.models import FileAsset
from ledger.services import InsufficientCreditsError, release_hold, reserve_credits
from runs.events import append_event, close_run_event_subscription, subscribe_run_events
from runs.models import CompareRun, Quote, Run, RunAttachment, RunEvent
from runs.options import RunOptionsError, normalize_options
from runs.rate_limits import allow_member_request
from runs.services import append_run_notice, canonical_attachment_ids, compare_payload_hash, request_hash, run_payload_hash
from workspace.models import Chat, Message


class RunInputSerializer(serializers.Serializer):
    chatId = serializers.UUIDField()
    parentId = serializers.UUIDField(required=False, allow_null=True, default=None)
    quoteId = serializers.UUIDField()
    mode = serializers.ChoiceField(choices=SUPPORTED_RUN_MODES)
    modelId = serializers.CharField(max_length=160, default="openrouter/auto")
    attachmentIds = serializers.ListField(child=serializers.UUIDField(), required=False, default=list, max_length=10)
    text = serializers.CharField(trim_whitespace=True, min_length=1, max_length=20_000)
    options = serializers.DictField(required=False, default=dict)


class RunEnvelopeSerializer(serializers.Serializer):
    data = serializers.DictField()


class CompareRouteSerializer(serializers.Serializer):
    modelId = serializers.CharField(max_length=160)
    quoteId = serializers.UUIDField()


class CompareRunInputSerializer(serializers.Serializer):
    chatId = serializers.UUIDField()
    parentId = serializers.UUIDField(required=False, allow_null=True, default=None)
    mode = serializers.ChoiceField(choices=("text", "research"))
    attachmentIds = serializers.ListField(child=serializers.UUIDField(), required=False, default=list, max_length=10)
    text = serializers.CharField(trim_whitespace=True, min_length=1, max_length=20_000)
    routes = CompareRouteSerializer(many=True, min_length=2, max_length=3)
    options = serializers.DictField(required=False, default=dict)

    def validate_routes(self, routes):
        model_ids = [route["modelId"] for route in routes]
        quote_ids = [route["quoteId"] for route in routes]
        if len(set(model_ids)) != len(model_ids) or len(set(quote_ids)) != len(quote_ids):
            raise serializers.ValidationError("Каждая модель и каждый расчёт могут участвовать только один раз.")
        return routes


class CompareRunEnvelopeSerializer(serializers.Serializer):
    data = serializers.DictField()


def run_payload(run: Run) -> dict:
    return {
        "runId": str(run.id),
        "chatId": str(run.chat_id),
        "outputMessageId": str(run.output_message_id) if run.output_message_id else None,
        "status": run.status,
        "estimatedCostMicro": run.estimated_cost_micro,
        "eventUrl": f"/api/v1/runs/{run.id}/events",
    }


def compare_payload(compare_run: CompareRun) -> dict:
    runs = list(compare_run.runs.order_by("comparison_position"))
    return {
        "compareId": str(compare_run.id),
        "inputMessageId": str(compare_run.input_message_id),
        "estimatedTotalCostMicro": sum(run.estimated_cost_micro for run in runs),
        "runs": [run_payload(run) for run in runs],
    }


class RunCollectionView(KuraiAPIView):
    @extend_schema(request=RunInputSerializer, responses={201: RunEnvelopeSerializer})
    def post(self, request):
        serializer = RunInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": {"code": "validation_error", "message": "Проверьте параметры запроса.", "details": serializer.errors}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        idempotency_key = request.headers.get("Idempotency-Key", "").strip()
        if not idempotency_key or len(idempotency_key) > 128:
            return Response(
                {"error": {"code": "idempotency_key_required", "message": "Для запуска нужен корректный Idempotency-Key."}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        data = serializer.validated_data
        try:
            options = normalize_options(data["mode"], data.get("options"))
        except RunOptionsError as error:
            return Response({"error": {"code": "invalid_options", "message": str(error)}}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        attachment_ids = canonical_attachment_ids(data["attachmentIds"])
        payload_hash = run_payload_hash(
            chat_id=str(data["chatId"]), quote_id=str(data["quoteId"]), mode=data["mode"], model_id=data["modelId"], text=data["text"], attachment_ids=attachment_ids, parent_id=data["parentId"], options=options
        )
        with transaction.atomic():
            existing = Run.objects.select_for_update().filter(user=request.user, idempotency_key=idempotency_key).first()
            if existing:
                if existing.payload_hash != payload_hash:
                    return Response(
                        {"error": {"code": "idempotency_conflict", "message": "Этот ключ уже использован с другими параметрами."}},
                        status=status.HTTP_409_CONFLICT,
                    )
                return Response({"data": run_payload(existing)}, status=status.HTTP_201_CREATED)

            allowed, retry_after = allow_member_request(member_id=str(request.user.id), scope="run", limit=settings.KURAI_RUN_START_RATE_LIMIT_COUNT)
            if not allowed:
                response = Response(
                    {"error": {"code": "rate_limited", "message": "Слишком много запусков. Повторите запрос немного позже."}},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
                response["Retry-After"] = str(retry_after)
                return response

            quote = Quote.objects.select_for_update().filter(id=data["quoteId"], user=request.user).first()
            if quote is None:
                return Response({"error": {"code": "not_found", "message": "Расчёт стоимости не найден."}}, status=status.HTTP_404_NOT_FOUND)
            if quote.used_at is not None or quote.expires_at <= timezone.now() or quote.attachment_ids != attachment_ids or quote.request_hash != request_hash(mode=data["mode"], model_id=data["modelId"], text=data["text"], attachment_ids=attachment_ids, options=options):
                return Response(
                    {"error": {"code": "quote_expired", "message": "Расчёт устарел. Получите новую стоимость."}},
                    status=status.HTTP_409_CONFLICT,
                )

            chat = Chat.objects.filter(id=data["chatId"], owner=request.user, archived_at__isnull=True).first()
            if chat is None:
                return Response({"error": {"code": "not_found", "message": "Диалог не найден."}}, status=status.HTTP_404_NOT_FOUND)
            parent = None
            if data["parentId"]:
                parent = Message.objects.filter(id=data["parentId"], chat=chat).first()
                if parent is None:
                    return Response({"error": {"code": "not_found", "message": "Сообщение для ветки не найдено."}}, status=status.HTTP_404_NOT_FOUND)

            attachments = list(FileAsset.objects.filter(owner=request.user, id__in=attachment_ids).only("id", "original_name", "size_bytes", "content_type"))
            if len(attachments) != len(attachment_ids):
                return Response({"error": {"code": "attachment_unavailable", "message": "Одно из вложений недоступно."}}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
            input_message = Message.objects.create(
                chat=chat,
                parent=parent,
                role=Message.Role.USER,
                mode=data["mode"],
                requested_model=quote.resolved_model,
                parts=[{"type": "text", "text": data["text"]}] + [
                    {"type": "file", "fileId": str(asset.id), "name": asset.original_name, "sizeBytes": asset.size_bytes, "mime": asset.content_type}
                    for asset in attachments
                ],
                text=data["text"],
            )
            output_message = Message.objects.create(
                chat=chat,
                parent=input_message,
                role=Message.Role.ASSISTANT,
                mode=data["mode"],
                resolved_model=quote.resolved_model,
                parts=(
                    [{"type": "job", "jobId": str(uuid.uuid4()), "kind": data["mode"], "status": "queued", "progress": 0}]
                    if data["mode"] in {"image", "video", "audio"} else []
                ),
            )
            run = Run.objects.create(
                user=request.user,
                chat=chat,
                quote=quote,
                input_message=input_message,
                output_message=output_message,
                mode=data["mode"],
                idempotency_key=idempotency_key,
                payload_hash=payload_hash,
                estimated_cost_micro=quote.estimated_cost_micro,
            )
            RunAttachment.objects.bulk_create([RunAttachment(run=run, file=asset) for asset in attachments])
            try:
                reserve_credits(user=request.user, run=run, estimated_micro=quote.estimated_cost_micro)
            except InsufficientCreditsError:
                transaction.set_rollback(True)
                return Response(
                    {"error": {"code": "insufficient_credits", "message": "Недостаточно кредитов для запуска."}},
                    status=status.HTTP_409_CONFLICT,
                )
            quote.used_at = timezone.now()
            quote.save(update_fields=("used_at",))
            append_event(run, RunEvent.Type.QUEUED, {"status": Run.Status.QUEUED})
        from runs.tasks import dispatch_run

        dispatch_run(str(run.id))
        if settings.KURAI_LOCAL_EXECUTE_RUNS:
            run.refresh_from_db()
        return Response({"data": run_payload(run)}, status=status.HTTP_201_CREATED)


class CompareRunCollectionView(KuraiAPIView):
    """Launch 2–3 explicitly chosen text routes from one immutable user prompt."""

    @extend_schema(request=CompareRunInputSerializer, responses={201: CompareRunEnvelopeSerializer})
    def post(self, request):
        serializer = CompareRunInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": {"code": "validation_error", "message": "Проверьте параметры сравнения.", "details": serializer.errors}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        idempotency_key = request.headers.get("Idempotency-Key", "").strip()
        if not idempotency_key or len(idempotency_key) > 128:
            return Response(
                {"error": {"code": "idempotency_key_required", "message": "Для сравнения нужен корректный Idempotency-Key."}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        data = serializer.validated_data
        try:
            options = normalize_options(data["mode"], data.get("options"))
        except RunOptionsError as error:
            return Response({"error": {"code": "invalid_options", "message": str(error)}}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        attachment_ids = canonical_attachment_ids(data["attachmentIds"])
        payload_hash = compare_payload_hash(
            chat_id=str(data["chatId"]),
            mode=data["mode"],
            text=data["text"],
            routes=data["routes"],
            attachment_ids=attachment_ids,
            parent_id=data["parentId"],
            options=options,
        )
        created_runs: list[Run] = []
        with transaction.atomic():
            existing = CompareRun.objects.select_for_update().filter(user=request.user, idempotency_key=idempotency_key).first()
            if existing:
                if existing.payload_hash != payload_hash:
                    return Response(
                        {"error": {"code": "idempotency_conflict", "message": "Этот ключ уже использован с другими параметрами."}},
                        status=status.HTTP_409_CONFLICT,
                    )
                return Response({"data": compare_payload(existing)}, status=status.HTTP_201_CREATED)

            allowed, retry_after = allow_member_request(member_id=str(request.user.id), scope="compare_run", limit=settings.KURAI_RUN_START_RATE_LIMIT_COUNT)
            if not allowed:
                response = Response(
                    {"error": {"code": "rate_limited", "message": "Слишком много запусков. Повторите запрос немного позже."}},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
                response["Retry-After"] = str(retry_after)
                return response

            chat = Chat.objects.filter(id=data["chatId"], owner=request.user, archived_at__isnull=True).first()
            if chat is None:
                return Response({"error": {"code": "not_found", "message": "Диалог не найден."}}, status=status.HTTP_404_NOT_FOUND)
            parent = None
            if data["parentId"]:
                parent = Message.objects.filter(id=data["parentId"], chat=chat).first()
                if parent is None:
                    return Response({"error": {"code": "not_found", "message": "Сообщение для ветки не найдено."}}, status=status.HTTP_404_NOT_FOUND)

            attachments = list(FileAsset.objects.filter(owner=request.user, id__in=attachment_ids).only("id", "original_name", "size_bytes", "content_type"))
            if len(attachments) != len(attachment_ids):
                return Response({"error": {"code": "attachment_unavailable", "message": "Одно из вложений недоступно."}}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

            quoted_by_id = {
                str(quote.id): quote
                for quote in Quote.objects.select_for_update().filter(id__in=[route["quoteId"] for route in data["routes"]], user=request.user)
            }
            quotes: list[Quote] = []
            for route in data["routes"]:
                quote = quoted_by_id.get(str(route["quoteId"]))
                if (
                    quote is None
                    or quote.used_at is not None
                    or quote.expires_at <= timezone.now()
                    or quote.mode != data["mode"]
                    or quote.resolved_model != route["modelId"]
                    or quote.attachment_ids != attachment_ids
                    or quote.request_hash != request_hash(mode=data["mode"], model_id=route["modelId"], text=data["text"], attachment_ids=attachment_ids, options=options)
                ):
                    return Response(
                        {"error": {"code": "quote_expired", "message": "Один из расчётов устарел. Получите новую стоимость."}},
                        status=status.HTTP_409_CONFLICT,
                    )
                quotes.append(quote)

            input_message = Message.objects.create(
                chat=chat,
                parent=parent,
                role=Message.Role.USER,
                mode=data["mode"],
                parts=[{"type": "text", "text": data["text"]}] + [
                    {"type": "file", "fileId": str(asset.id), "name": asset.original_name, "sizeBytes": asset.size_bytes, "mime": asset.content_type}
                    for asset in attachments
                ],
                text=data["text"],
            )
            compare_run = CompareRun.objects.create(
                user=request.user,
                chat=chat,
                input_message=input_message,
                mode=data["mode"],
                idempotency_key=idempotency_key,
                payload_hash=payload_hash,
            )
            for position, quote in enumerate(quotes):
                output_message = Message.objects.create(
                    chat=chat,
                    parent=input_message,
                    role=Message.Role.ASSISTANT,
                    mode=data["mode"],
                    resolved_model=quote.resolved_model,
                )
                run = Run.objects.create(
                    user=request.user,
                    chat=chat,
                    quote=quote,
                    comparison=compare_run,
                    comparison_position=position,
                    input_message=input_message,
                    output_message=output_message,
                    mode=data["mode"],
                    # The group key may be 128 chars.  Derive a stable child key
                    # instead of appending a suffix that could overflow the column
                    # or collide with a regular single-route request.
                    idempotency_key=str(
                        uuid.uuid5(
                            uuid.NAMESPACE_URL,
                            f"compare:{request.user.id}:{idempotency_key}:{position}",
                        )
                    ),
                    payload_hash=payload_hash,
                    estimated_cost_micro=quote.estimated_cost_micro,
                )
                RunAttachment.objects.bulk_create([RunAttachment(run=run, file=asset) for asset in attachments])
                try:
                    reserve_credits(user=request.user, run=run, estimated_micro=quote.estimated_cost_micro)
                except InsufficientCreditsError:
                    transaction.set_rollback(True)
                    return Response(
                        {"error": {"code": "insufficient_credits", "message": "Недостаточно кредитов для сравнения."}},
                        status=status.HTTP_409_CONFLICT,
                    )
                quote.used_at = timezone.now()
                quote.save(update_fields=("used_at",))
                append_event(run, RunEvent.Type.QUEUED, {"status": Run.Status.QUEUED})
                created_runs.append(run)

        from runs.tasks import dispatch_run

        for run in created_runs:
            dispatch_run(str(run.id))
        return Response({"data": compare_payload(compare_run)}, status=status.HTTP_201_CREATED)


def owned_run_or_not_found(user, run_id):
    return Run.objects.filter(id=run_id, user=user).select_related("hold").first()


class RunDetailView(KuraiAPIView):
    @extend_schema(responses=RunEnvelopeSerializer)
    def get(self, request, run_id):
        run = owned_run_or_not_found(request.user, run_id)
        if run is None:
            return Response({"error": {"code": "not_found", "message": "Запуск не найден."}}, status=status.HTTP_404_NOT_FOUND)
        return Response({"data": run_payload(run)})


class RunCancelView(KuraiAPIView):
    @extend_schema(request=None, responses=RunEnvelopeSerializer)
    def post(self, request, run_id):
        with transaction.atomic():
            run = Run.objects.select_for_update().filter(id=run_id, user=request.user).select_related("hold", "output_message").first()
            if run is None:
                return Response({"error": {"code": "not_found", "message": "Запуск не найден."}}, status=status.HTTP_404_NOT_FOUND)
            if run.status == Run.Status.QUEUED:
                run.status = Run.Status.CANCELED
                run.save(update_fields=("status", "updated_at"))
                release_hold(run.hold)
                if run.mode in {"image", "video", "audio"} and run.output_message_id:
                    run.output_message.parts = [{"type": "job", "jobId": str(run.id), "kind": run.mode, "status": "canceled", "progress": 0}]
                    run.output_message.save(update_fields=("parts",))
                append_event(run, RunEvent.Type.CANCELED, {"status": Run.Status.CANCELED})
            elif run.status == Run.Status.RUNNING:
                run.status = Run.Status.CANCEL_REQUESTED
                run.save(update_fields=("status", "updated_at"))
                if run.mode not in {"image", "video", "audio"} and run.output_message_id:
                    append_run_notice(run.output_message, "Остановка генерации запрошена")
                append_event(run, RunEvent.Type.CANCEL_REQUESTED, {"status": Run.Status.CANCEL_REQUESTED})
        return Response({"data": run_payload(run)})


class RunEventStreamView(KuraiAPIView):
    @extend_schema(responses=None)
    def get(self, request, run_id):
        run = owned_run_or_not_found(request.user, run_id)
        if run is None:
            return Response({"error": {"code": "not_found", "message": "Запуск не найден."}}, status=status.HTTP_404_NOT_FOUND)
        try:
            last_event_id = max(0, int(request.headers.get("Last-Event-ID", "0")))
        except ValueError:
            return Response(
                {"error": {"code": "validation_error", "message": "Last-Event-ID должен быть целым числом."}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        def stream_events():
            cursor = last_event_id
            deadline = time.monotonic() + settings.KURAI_SSE_MAX_SECONDS
            heartbeat_at = time.monotonic() + settings.KURAI_SSE_HEARTBEAT_SECONDS
            subscription = subscribe_run_events(str(run.id))
            terminal_statuses = {Run.Status.COMPLETED, Run.Status.FAILED, Run.Status.CANCELED}
            yielded_event = False
            try:
                while True:
                    events = list(RunEvent.objects.filter(run_id=run.id, seq__gt=cursor).order_by("seq"))
                    for event in events:
                        payload = json.dumps({"type": event.type, **event.payload}, ensure_ascii=False, separators=(",", ":"))
                        yield f"id: {event.seq}\nevent: {event.type}\ndata: {payload}\n\n"
                        cursor = event.seq
                        yielded_event = True

                    current_status = Run.objects.values_list("status", flat=True).get(id=run.id)
                    if current_status in terminal_statuses:
                        return

                    remaining = deadline - time.monotonic()
                    if remaining <= 0:
                        if not yielded_event:
                            yield ": heartbeat\n\n"
                        return

                    wait_seconds = min(remaining, settings.KURAI_SSE_HEARTBEAT_SECONDS)
                    if subscription is None:
                        # Redis is advisory only. Poll more often than the heartbeat
                        # so a temporary Redis outage does not leave the UI stale.
                        time.sleep(min(wait_seconds, 1))
                    else:
                        _, pubsub = subscription
                        pubsub.get_message(timeout=wait_seconds)

                    if time.monotonic() >= heartbeat_at:
                        yield ": heartbeat\n\n"
                        heartbeat_at = time.monotonic() + settings.KURAI_SSE_HEARTBEAT_SECONDS
            finally:
                close_run_event_subscription(subscription)

        response = StreamingHttpResponse(stream_events(), content_type="text/event-stream; charset=utf-8")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        response["Connection"] = "keep-alive"
        return response
