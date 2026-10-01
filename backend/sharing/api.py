from datetime import timedelta

from django.db import models, transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from kurai.api import KuraiAPIView
from sharing.models import ShareLink
from sharing.throttles import SharedChatThrottle
from workspace.models import Chat, Message


class ShareLinkInputSerializer(serializers.Serializer):
    expiresInHours = serializers.IntegerField(min_value=1, max_value=720, default=168, required=False)


class ShareEnvelopeSerializer(serializers.Serializer):
    data = serializers.DictField()


def not_found() -> Response:
    return Response({"error": {"code": "not_found", "message": "Ресурс не найден."}}, status=status.HTTP_404_NOT_FOUND)


def link_payload(link: ShareLink) -> dict:
    return {
        "id": str(link.id),
        "token": link.token,
        "chatId": str(link.chat_id),
        "expiresAt": link.expires_at.isoformat() if link.expires_at else None,
        "createdAt": link.created_at.isoformat(),
    }


def public_message_payload(message: Message) -> dict | None:
    if message.role not in {Message.Role.USER, Message.Role.ASSISTANT}:
        return None
    text = "".join(
        str(part.get("text", ""))
        for part in message.parts
        if isinstance(part, dict) and part.get("type") == "text"
    ).strip()
    return {
        "role": message.role,
        "model": (message.resolved_model or message.requested_model or None) if message.role == Message.Role.ASSISTANT else None,
        "text": text or message.text,
    }


def snapshot_payload(chat: Chat) -> dict:
    messages = Message.objects.filter(chat=chat).only(
        "role", "requested_model", "resolved_model", "parts", "text"
    )
    public_messages = [payload for message in messages if (payload := public_message_payload(message))]
    return {"chat": {"title": chat.title}, "messages": public_messages}


class ChatShareLinkView(KuraiAPIView):
    @extend_schema(responses=ShareEnvelopeSerializer)
    def get(self, request, chat_id):
        chat = Chat.objects.filter(id=chat_id, owner=request.user).first()
        if chat is None:
            return not_found()
        now = timezone.now()
        links = ShareLink.objects.filter(chat=chat, revoked_at__isnull=True).filter(models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now)).order_by("-created_at")
        return Response({"data": [link_payload(link) for link in links]})

    @extend_schema(request=ShareLinkInputSerializer, responses={201: ShareEnvelopeSerializer})
    def post(self, request, chat_id):
        serializer = ShareLinkInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": {"code": "validation_error", "message": "Проверьте параметры ссылки.", "details": serializer.errors}}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        with transaction.atomic():
            chat = Chat.objects.select_for_update().filter(id=chat_id, owner=request.user).first()
            if chat is None:
                return not_found()
            now = timezone.now()
            # One explicit external surface per chat: replacing it invalidates every older token.
            ShareLink.objects.filter(chat=chat, revoked_at__isnull=True).update(revoked_at=now)
            hours = serializer.validated_data["expiresInHours"]
            link = ShareLink.objects.create(
                owner=request.user,
                chat=chat,
                expires_at=now + timedelta(hours=hours),
                snapshot=snapshot_payload(chat),
            )
        return Response({"data": link_payload(link)}, status=status.HTTP_201_CREATED)


class ShareLinkRevokeView(KuraiAPIView):
    @extend_schema(request=None, responses=ShareEnvelopeSerializer)
    def post(self, request, link_id):
        link = ShareLink.objects.filter(id=link_id, owner=request.user).first()
        if link is None:
            return not_found()
        if link.revoked_at is None:
            link.revoked_at = timezone.now()
            link.save(update_fields=("revoked_at",))
        return Response({"data": {"id": str(link.id), "revoked": True}})


class SharedChatView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [SharedChatThrottle]

    @extend_schema(responses=ShareEnvelopeSerializer)
    def get(self, request, token):
        link = ShareLink.objects.select_related("chat").filter(token=token, revoked_at__isnull=True).first()
        if link is None or (link.expires_at is not None and link.expires_at <= timezone.now()):
            return not_found()
        # Snapshot is written at link creation. Older database rows are treated as unavailable
        # rather than accidentally exposing a later version of a private working chat.
        if not link.snapshot:
            return not_found()
        return Response({"data": link.snapshot})
