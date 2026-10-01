from django.conf import settings

from model_catalog.models import CatalogModel


CAPABILITY_MODES = ("text", "research", "slides", "image", "video", "audio")


def capability_payloads() -> list[dict]:
    """Describe only modes this deployment can actually execute.

    The catalog identifies model support, while media modes additionally
    require the server-only OpenRouter key and a private asset pipeline.
    """
    active_models = list(CatalogModel.objects.filter(active=True).only("id", "input_modalities", "output_modalities", "is_router"))
    text_count = sum(model.supports_chat for model in active_models)
    image_count = sum(model.supports_image for model in active_models)
    video_count = sum(model.supports_video for model in active_models)
    audio_count = sum(model.supports_audio for model in active_models)
    return [
        {"id": "text", "available": bool(text_count), "modelCount": text_count},
        {"id": "research", "available": bool(text_count), "modelCount": text_count},
        {"id": "slides", "available": bool(text_count), "modelCount": text_count},
        {"id": "image", "available": bool(image_count and settings.OPENROUTER_API_KEY), "modelCount": image_count},
        {"id": "video", "available": bool(video_count and settings.OPENROUTER_API_KEY), "modelCount": video_count},
        {"id": "audio", "available": bool(audio_count and settings.OPENROUTER_API_KEY), "modelCount": audio_count},
    ]
