import uuid

from django.conf import settings
from django.db import models


def generated_asset_path(instance, filename: str) -> str:
    return f"generated/{instance.owner_id}/{instance.id}/{filename}"


class GeneratedAsset(models.Model):
    """An owner-scoped, immutable binary produced by a completed provider run."""

    class Kind(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"
        AUDIO = "audio", "Audio"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="generated_assets")
    run = models.ForeignKey("runs.Run", on_delete=models.CASCADE, related_name="generated_assets")
    message = models.ForeignKey("workspace.Message", on_delete=models.CASCADE, related_name="generated_assets")
    kind = models.CharField(max_length=16, choices=Kind.choices)
    file = models.FileField(upload_to=generated_asset_path)
    content_type = models.CharField(max_length=120)
    size_bytes = models.PositiveBigIntegerField()
    prompt = models.TextField()
    requested_model = models.CharField(max_length=160)
    resolved_model = models.CharField(max_length=160)
    cost_micro = models.BigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("owner", "-created_at"), name="generated_owner_created_ix")]
