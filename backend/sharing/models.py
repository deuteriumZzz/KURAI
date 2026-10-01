import secrets
import uuid

from django.conf import settings
from django.db import models


def share_token() -> str:
    return secrets.token_urlsafe(32)


class ShareLink(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="share_links")
    chat = models.ForeignKey("workspace.Chat", on_delete=models.CASCADE, related_name="share_links")
    token = models.CharField(max_length=64, unique=True, default=share_token, editable=False)
    # A shared result is immutable: later chat edits must not alter what was sent externally.
    snapshot = models.JSONField(default=dict)
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=("token",), name="share_token_ix")]
