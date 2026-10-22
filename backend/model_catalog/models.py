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
    # что объявила медиамодель: у видео — длительности, разрешение цены, форматы кадра; у озвучки — голоса
    media_spec = models.JSONField(default=dict, blank=True)
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
    def generates_media(self) -> bool:
        """Routers pick a model per request: their media price is unknowable before the run."""
        return not self.is_router and not self.id.startswith("openrouter/") and "text" in self.input_modalities

    @property
    def supports_image(self) -> bool:
        return self.generates_media and "image" in self.output_modalities

    @property
    def supports_audio(self) -> bool:
        return self.generates_media and "speech" in self.output_modalities

    @property
    def supports_video(self) -> bool:
        return self.generates_media and "video" in self.output_modalities

    def video_seconds(self, requested: int) -> int:
        """The clip length this model accepts: the nearest declared one not shorter than asked, else its longest."""
        declared = sorted(value for value in self.media_spec.get("durations") or () if isinstance(value, int) and value > 0)
        if not declared or requested in declared:
            return requested
        return next((value for value in declared if value >= requested), declared[-1])

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
