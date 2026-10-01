import json
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

from django.contrib.auth import authenticate, login, logout
from django.conf import settings
from django.core.cache import cache
from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse
from django.contrib.auth.password_validation import validate_password
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from kurai.api import KuraiAPIView
from ledger.models import CreditAccount, LedgerEntry
from ledger.services import grant_credits
from workspace.models import Chat, Message, Project


def auth_rate_limit_response(request, endpoint: str):
    """Bound unauthenticated attempts by IP without retaining credential input."""
    address = request.META.get("REMOTE_ADDR", "unknown")
    key = f"auth-rate:{endpoint}:{address}"
    if cache.add(key, 1, timeout=settings.AUTH_RATE_LIMIT_WINDOW_SECONDS):
        return None
    attempts = cache.incr(key)
    if attempts > settings.AUTH_RATE_LIMIT_COUNT:
        return Response(
            {"error": {"code": "rate_limited", "message": "Слишком много попыток. Повторите позже."}},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )
    return None


def member_payload(user: User, include_csrf: bool = False, request=None) -> dict:
    payload = {"id": str(user.id), "email": user.email, "displayName": user.display_name or user.email.split("@", 1)[0]}
    if include_csrf and request is not None:
        payload["csrfToken"] = get_token(request)
    return payload


class SignUpInputSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False, min_length=12, max_length=128)
    displayName = serializers.CharField(source="display_name", required=False, allow_blank=True, max_length=80)

    def validate(self, attrs):
        validate_password(attrs["password"], user=User(email=attrs["email"], display_name=attrs.get("display_name", "")))
        return attrs


class LoginInputSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)


class MemberEnvelopeSerializer(serializers.Serializer):
    data = serializers.DictField()


def account_export_archive(user: User) -> bytes:
    """Create a portable member-owned data archive without credentials or file bytes."""
    projects = list(Project.objects.filter(owner=user).values("id", "name", "accent", "created_at", "updated_at"))
    chats = list(Chat.objects.filter(owner=user).values("id", "project_id", "title", "pinned", "created_at", "updated_at"))
    messages = list(
        Message.objects.filter(chat__owner=user).values(
            "id", "chat_id", "parent_id", "role", "mode", "requested_model", "resolved_model", "parts", "text", "created_at"
        )
    )
    account = CreditAccount.objects.filter(owner=user).only("id").first()
    ledger = list(LedgerEntry.objects.filter(account=account).values("id", "amount_micro", "kind", "correlation_id", "created_at")) if account else []
    payloads = {
        "profile.json": {"id": user.id, "email": user.email, "displayName": user.display_name or user.email.split("@", 1)[0]},
        "workspace.json": {"projects": projects, "chats": chats, "messages": messages},
        "ledger.json": {"entries": ledger},
    }
    stream = BytesIO()
    with ZipFile(stream, "w", compression=ZIP_DEFLATED) as archive:
        for filename, payload in payloads.items():
            archive.writestr(filename, json.dumps(payload, ensure_ascii=False, cls=DjangoJSONEncoder, separators=(",", ":")))
    return stream.getvalue()


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses=MemberEnvelopeSerializer)
    def get(self, request):
        return Response({"data": {"csrfToken": get_token(request)}})


class SignUpView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=SignUpInputSerializer, responses={201: MemberEnvelopeSerializer})
    def post(self, request):
        rate_limited = auth_rate_limit_response(request, "sign-up")
        if rate_limited:
            return rate_limited
        serializer = SignUpInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": {"code": "validation_error", "message": "Проверьте данные регистрации.", "details": serializer.errors}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        data = serializer.validated_data
        if User.objects.filter(email__iexact=data["email"]).exists():
            return Response({"error": {"code": "email_already_used", "message": "Этот email уже зарегистрирован."}}, status=status.HTTP_409_CONFLICT)
        user = User.objects.create_user(**data)
        grant_credits(user, 100_000, correlation_id=f"signup:{user.id}")
        login(request, user)
        return Response({"data": member_payload(user, include_csrf=True, request=request)}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=LoginInputSerializer, responses=MemberEnvelopeSerializer)
    def post(self, request):
        rate_limited = auth_rate_limit_response(request, "login")
        if rate_limited:
            return rate_limited
        serializer = LoginInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": {"code": "validation_error", "message": "Проверьте данные входа.", "details": serializer.errors}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        user = authenticate(request, email=serializer.validated_data["email"].lower(), password=serializer.validated_data["password"])
        if user is None:
            return Response({"error": {"code": "invalid_credentials", "message": "Email или пароль неверны."}}, status=status.HTTP_401_UNAUTHORIZED)
        login(request, user)
        return Response({"data": member_payload(user, include_csrf=True, request=request)})


class LogoutView(KuraiAPIView):
    @extend_schema(request=None, responses=MemberEnvelopeSerializer)
    def post(self, request):
        logout(request)
        return Response({"data": {"signedOut": True}})


class MeView(KuraiAPIView):
    @extend_schema(responses=MemberEnvelopeSerializer)
    def get(self, request):
        return Response({"data": member_payload(request.user)})


class AccountExportView(KuraiAPIView):
    """Return a short-lived private download response; no export is stored server-side."""

    @extend_schema(responses=None)
    def get(self, request):
        response = HttpResponse(account_export_archive(request.user), content_type="application/zip")
        response["Content-Disposition"] = 'attachment; filename="kurai-account-export.zip"'
        response["Cache-Control"] = "no-store"
        return response
