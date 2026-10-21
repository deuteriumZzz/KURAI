from datetime import timedelta

from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema
from django.utils import timezone
from django.conf import settings
from django.db import DatabaseError, connection

from accounts.mail import mail_ready
from model_catalog.models import CatalogModel
from model_catalog.capabilities import capability_payloads
from files.models import FileAsset
from runs.models import Quote
from runs.rate_limits import allow_member_request
from runs.options import RunOptionsError, normalize_options
from runs.services import canonical_attachment_ids, estimate_cost_micro, estimate_parts_usd, request_hash, usd_to_micro


SUPPORTED_RUN_MODES = ("text", "research", "slides", "image", "video", "audio")


class QuoteRequestSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=SUPPORTED_RUN_MODES)
    modelId = serializers.CharField(max_length=160, default="openrouter/auto")
    attachmentIds = serializers.ListField(child=serializers.UUIDField(), required=False, default=list, max_length=10)
    text = serializers.CharField(trim_whitespace=True, min_length=1, max_length=20_000)
    options = serializers.DictField(required=False, default=dict)


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses=None)
    def get(self, request):
        return Response({"data": {"service": "kurai-api", "status": "ok", "version": "v1"}})


def database_ready() -> bool:
    """Make readiness depend on the durable state store without exposing it."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            return cursor.fetchone() == (1,)
    except DatabaseError:
        return False


class ReadinessView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses=None)
    def get(self, request):
        if database_ready():
            return Response({"data": {"service": "kurai-api", "status": "ready", "version": "v1"}})
        return Response(
            {"error": {"code": "service_unavailable", "message": "Сервис временно недоступен."}},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class ServiceStatusView(APIView):
    """Public, evidence-based state for the status page; never a fake uptime claim."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(responses=None)
    def get(self, request):
        if not database_ready():
            return Response(
                {"error": {"code": "service_unavailable", "message": "Сервис временно недоступен."}},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        active_models = CatalogModel.objects.filter(active=True).only("synced_at")
        newest_sync = active_models.order_by("-synced_at").values_list("synced_at", flat=True).first()
        reasons: list[str] = []
        if not active_models.exists():
            reasons.append("catalog_empty")
        elif newest_sync is None or newest_sync < timezone.now() - timedelta(seconds=settings.KURAI_CATALOG_MAX_AGE_SECONDS):
            reasons.append("catalog_stale")
        if not settings.OPENROUTER_API_KEY:
            reasons.append("provider_not_configured")
        if not mail_ready():
            reasons.append("mail_unconfigured")
        return Response(
            {
                "data": {
                    "status": "degraded" if reasons else "ok",
                    "modelsOnline": active_models.count(),
                    "capabilities": capability_payloads(),
                    "reasons": reasons,
                }
            }
        )


class PublicReadThrottle(AnonRateThrottle):
    """Anonymous catalog and price-hint reads (landing, public model page) are bounded; members are not throttled."""

    scope = "public_read"

    def get_rate(self):
        return api_settings.DEFAULT_THROTTLE_RATES[self.scope]


class KuraiAPIView(APIView):
    """Stable public error envelope for authenticated API resources."""

    def handle_exception(self, exc):
        response = super().handle_exception(exc)
        if response.status_code == status.HTTP_403_FORBIDDEN and not self.request.user.is_authenticated:
            response.status_code = status.HTTP_401_UNAUTHORIZED
            response.data = {"error": {"code": "authentication_required", "message": "Войдите, чтобы продолжить работу."}}
        return response


class QuoteView(KuraiAPIView):
    """Server-owned preflight quote. It cannot reserve or charge credits."""

    @extend_schema(request=QuoteRequestSerializer, responses=None)
    def post(self, request):
        allowed, retry_after = allow_member_request(member_id=str(request.user.id), scope="quote", limit=settings.KURAI_RUN_QUOTE_RATE_LIMIT_COUNT)
        if not allowed:
            response = Response(
                {"error": {"code": "rate_limited", "message": "Слишком много расчётов. Повторите запрос немного позже."}},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
            response["Retry-After"] = str(retry_after)
            return response
        serializer = QuoteRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": {"code": "validation_error", "message": "Проверьте параметры запроса.", "details": serializer.errors}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        data = serializer.validated_data
        try:
            options = normalize_options(data["mode"], data.get("options"))
        except RunOptionsError as error:
            return Response({"error": {"code": "invalid_options", "message": str(error)}}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        attachment_ids = canonical_attachment_ids(data["attachmentIds"])
        if len(attachment_ids) != len(data["attachmentIds"]) or FileAsset.objects.filter(owner=request.user, id__in=attachment_ids).count() != len(attachment_ids):
            return Response(
                {"error": {"code": "attachment_unavailable", "message": "Одно из вложений недоступно."}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        model = CatalogModel.objects.filter(id=data["modelId"], active=True).first()
        if model is None or data["mode"] not in model.supported_modes():
            return Response(
                {"error": {"code": "model_unavailable", "message": "Эта модель сейчас недоступна для выбранного режима."}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        expires_in_seconds = 60
        quote = Quote.objects.create(
            user=request.user,
            mode=data["mode"],
            request_hash=request_hash(mode=data["mode"], model_id=model.id, text=data["text"], attachment_ids=attachment_ids, options=options),
            resolved_model=model.id,
            attachment_ids=attachment_ids,
            options=options,
            estimated_cost_micro=estimate_cost_micro(model=model, text=data["text"], mode=data["mode"], options=options),
            expires_at=timezone.now() + timedelta(seconds=expires_in_seconds),
        )
        return Response(
            {
                "data": {
                    "quoteId": str(quote.id),
                    "mode": quote.mode,
                    "resolvedModel": quote.resolved_model,
                    "estimatedCostMicro": quote.estimated_cost_micro,
                    "options": quote.options,
                    "expiresInSeconds": expires_in_seconds,
                }
            }
        )


class EstimateRequestSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=SUPPORTED_RUN_MODES)
    modelId = serializers.CharField(max_length=160)
    chars = serializers.IntegerField(min_value=0, max_value=20_000, default=0)
    options = serializers.DictField(required=False, default=dict)


class EstimateView(KuraiAPIView):
    """Live price hint by the quote's own formula. It stores nothing, so the composer never spends the quote limit.
    Public: the landing shows the same price a member would see before sending."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicReadThrottle]

    @extend_schema(request=EstimateRequestSerializer, responses=None)
    def post(self, request):
        serializer = EstimateRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": {"code": "validation_error", "message": "Проверьте параметры запроса.", "details": serializer.errors}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        data = serializer.validated_data
        try:
            options = normalize_options(data["mode"], data.get("options"))
        except RunOptionsError as error:
            return Response({"error": {"code": "invalid_options", "message": str(error)}}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        model = CatalogModel.objects.filter(id=data["modelId"], active=True).first()
        if model is None or data["mode"] not in model.supported_modes():
            return Response(
                {"error": {"code": "model_unavailable", "message": "Эта модель сейчас недоступна для выбранного режима."}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        # only the draft's length matters to the price, so the draft itself stays in the browser
        text = " " * max(1, data["chars"])
        parts = estimate_parts_usd(model=model, text=text, mode=data["mode"], options=options)
        return Response(
            {
                "data": {
                    "estimatedCostMicro": estimate_cost_micro(model=model, text=text, mode=data["mode"], options=options),
                    # each part rounded up on its own, so the cells may add up a micro-credit above the total
                    "parts": {name: usd_to_micro(amount) for name, amount in parts.items()},
                }
            }
        )
