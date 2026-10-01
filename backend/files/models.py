import uuid

from django.conf import settings
from django.db import models


def asset_path(instance, filename: str) -> str:
    return f"assets/{instance.owner_id}/{instance.id}/{filename}"


class FileAsset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="files")
    project = models.ForeignKey("workspace.Project", null=True, blank=True, on_delete=models.SET_NULL, related_name="files")
    chat = models.ForeignKey("workspace.Chat", null=True, blank=True, on_delete=models.SET_NULL, related_name="files")
    file = models.FileField(upload_to=asset_path)
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=120)
    size_bytes = models.PositiveBigIntegerField()
    sha256 = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("owner", "-created_at"), name="file_owner_created_ix")]
