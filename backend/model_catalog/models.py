from decimal import Decimal

from django.db import models


class CatalogModel(models.Model):
    """A server-owned projection of OpenRouter's model catalog and prices."""

    id = models.CharField(primary_key=True, max_length=160)
    name = models.CharField(max_length=200)
    provider = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    input_modalities = models.JSONField(default=list)
    output_modalities = models.JSONField(default=list)
    context_length = models.PositiveIntegerField(default=0)
    prompt_price_usd_per_token = models.DecimalField(max_digits=22, decimal_places=15, default=Decimal("0"))
    completion_price_usd_per_token = models.DecimalField(max_digits=22, decimal_places=15, default=Decimal("0"))
    image_price_usd_per_generation = models.DecimalField(max_digits=22, decimal_places=15, default=Decimal("0"))
    audio_price_usd_per_character = models.DecimalField(max_digits=22, decimal_places=15, default=Decimal("0"))
    video_price_usd_per_second = models.DecimalField(max_digits=22, decimal_places=15, default=Decimal("0"))
    active = models.BooleanField(default=True)
    is_router = models.BooleanField(default=False)
    synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=("active", "name"), name="catalog_active_name_ix")]

    @property
    def supports_chat(self) -> bool:
        return self.is_router or ("text" in self.input_modalities and "text" in self.output_modalities)

    @property
    def supports_image(self) -> bool:
        return "text" in self.input_modalities and "image" in self.output_modalities

    @property
    def supports_audio(self) -> bool:
        return "text" in self.input_modalities and "speech" in self.output_modalities

    @property
    def supports_video(self) -> bool:
        return "text" in self.input_modalities and "video" in self.output_modalities

    def supported_modes(self) -> list[str]:
        modes: list[str] = []
        if self.supports_chat:
            modes.extend(("text", "research", "slides"))
        if self.supports_image:
            modes.append("image")
        if self.supports_video:
            modes.append("video")
        if self.supports_audio:
            modes.append("audio")
        return modes
