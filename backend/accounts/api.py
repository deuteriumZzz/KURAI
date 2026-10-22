import json
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

from django.contrib.auth import authenticate, login, logout
from django.conf import settings
from django.core.cache import cache
from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth.tokens import default_token_generator
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

from accounts.mail import mail_ready, read_verification_token, send_password_reset, send_verification
from accounts.models import TelegramIdentity, User
from accounts.telegram import EMAIL_DOMAIN, has_mailbox, verified_login
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
    # у аккаунта из Telegram нет почты: служебный адрес наружу не отдаём и подтверждать нечего
    mailbox = has_mailbox(user.email)
    payload = {
        "id": str(user.id),
        "email": user.email if mailbox else "",
        "displayName": user.display_name or (user.email.split("@", 1)[0] if mailbox else "Telegram"),
        "emailVerified": user.email_verified_at is not None or not mailbox,
    }
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
        # письмо подтверждения — по возможности; сбой почты не мешает регистрации
        send_verification(user)
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


class TelegramLoginView(APIView):
    """Sign in with the Telegram Login Widget: the bot token verifies the payload, the account is found or created."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(request=None, responses=MemberEnvelopeSerializer)
    def post(self, request):
        if not settings.TELEGRAM_BOT_TOKEN:
            return Response({"error": {"code": "telegram_unavailable", "message": "Вход через Telegram не настроен."}}, status=status.HTTP_404_NOT_FOUND)
        rate_limited = auth_rate_limit_response(request, "telegram")
        if rate_limited:
            return rate_limited
        fields = verified_login(request.data, bot_token=settings.TELEGRAM_BOT_TOKEN, max_age=settings.TELEGRAM_AUTH_MAX_AGE_SECONDS)
        if fields is None:
            return Response(
                {"error": {"code": "invalid_telegram_login", "message": "Telegram не подтвердил вход. Попробуйте ещё раз."}},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        telegram_id = int(fields["id"])
        identity = TelegramIdentity.objects.select_related("user").filter(telegram_id=telegram_id).first()
        if identity is None:
            name = " ".join(str(fields.get(key, "")) for key in ("first_name", "last_name")).strip()[:80]
            try:
                with transaction.atomic():
                    user = User.objects.create_user(email=f"tg{telegram_id}@{EMAIL_DOMAIN}", password=None, display_name=name)
                    TelegramIdentity.objects.create(user=user, telegram_id=telegram_id, username=str(fields.get("username", ""))[:64])
                    grant_credits(user, 100_000, correlation_id=f"signup:{user.id}")
            except IntegrityError:
                # два первых входа одновременно: аккаунт уже создан соседним запросом
                user = TelegramIdentity.objects.select_related("user").get(telegram_id=telegram_id).user
        else:
            user = identity.user
        if not user.is_active:
            return Response({"error": {"code": "account_disabled", "message": "Аккаунт отключён."}}, status=status.HTTP_403_FORBIDDEN)
        login(request, user)
        return Response({"data": member_payload(user, include_csrf=True, request=request)})


MAIL_UNAVAILABLE = {"error": {"code": "mail_unavailable", "message": "Отправка писем ещё не подключена на этом сервере."}}


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(max_length=64)
    token = serializers.CharField(max_length=128)
    password = serializers.CharField(write_only=True, trim_whitespace=False, min_length=12, max_length=128)


class EmailVerifySerializer(serializers.Serializer):
    token = serializers.CharField(max_length=512)


class PasswordResetRequestView(APIView):
    """Always the same answer, so the endpoint never reveals whether an address is registered."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(request=PasswordResetRequestSerializer, responses=None)
    def post(self, request):
        rate_limited = auth_rate_limit_response(request, "password-reset")
        if rate_limited:
            return rate_limited
        if not mail_ready():
            return Response(MAIL_UNAVAILABLE, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": {"code": "validation_error", "message": "Проверьте email.", "details": serializer.errors}}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"], is_active=True).first()
        if user is not None:
            send_password_reset(user)
        return Response({"data": {"sent": True}}, status=status.HTTP_202_ACCEPTED)


class PasswordResetConfirmView(APIView):
    """One-time link: the token is bound to the current password hash, so it dies once the password changes."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(request=PasswordResetConfirmSerializer, responses=None)
    def post(self, request):
        rate_limited = auth_rate_limit_response(request, "password-reset-confirm")
        if rate_limited:
            return rate_limited
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": {"code": "validation_error", "message": "Пароль — от 12 символов.", "details": serializer.errors}}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        data = serializer.validated_data
        try:
            user = User.objects.filter(pk=force_str(urlsafe_base64_decode(data["uid"])), is_active=True).first()
        except (ValueError, TypeError, OverflowError, UnicodeDecodeError, DjangoValidationError):
            user = None
        if user is None or not default_token_generator.check_token(user, data["token"]):
            return Response({"error": {"code": "reset_link_invalid", "message": "Ссылка устарела или уже использована. Запросите новую."}}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(data["password"], user=user)
        except DjangoValidationError as error:
            return Response({"error": {"code": "validation_error", "message": " ".join(error.messages), "details": {"password": error.messages}}}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        user.set_password(data["password"])
        # письмо пришло на этот адрес — значит, он рабочий
        user.email_verified_at = user.email_verified_at or timezone.now()
        user.save(update_fields=("password", "email_verified_at"))
        return Response({"data": {"passwordChanged": True}})


class EmailVerifyView(APIView):
    """The link may be opened in another browser, so it works without a session."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(request=EmailVerifySerializer, responses=None)
    def post(self, request):
        rate_limited = auth_rate_limit_response(request, "verify-email")
        if rate_limited:
            return rate_limited
        serializer = EmailVerifySerializer(data=request.data)
        claims = read_verification_token(serializer.validated_data["token"]) if serializer.is_valid() else None
        user = User.objects.filter(pk=claims[0], email__iexact=claims[1]).first() if claims and claims[0] and claims[1] else None
        if user is None:
            return Response({"error": {"code": "verify_link_invalid", "message": "Ссылка устарела. Отправьте письмо ещё раз из кабинета."}}, status=status.HTTP_400_BAD_REQUEST)
        if user.email_verified_at is None:
            user.email_verified_at = timezone.now()
            user.save(update_fields=("email_verified_at",))
        return Response({"data": {"emailVerified": True}})


class EmailVerifyResendView(KuraiAPIView):
    @extend_schema(request=None, responses=None)
    def post(self, request):
        rate_limited = auth_rate_limit_response(request, "verify-email-resend")
        if rate_limited:
            return rate_limited
        if request.user.email_verified_at is not None:
            return Response({"data": {"emailVerified": True}})
        if not mail_ready():
            return Response(MAIL_UNAVAILABLE, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        send_verification(request.user)
        return Response({"data": {"sent": True}}, status=status.HTTP_202_ACCEPTED)


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
