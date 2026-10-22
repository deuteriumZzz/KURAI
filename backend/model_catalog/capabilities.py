from model_catalog.models import CatalogModel


CAPABILITY_MODES = ("text", "research", "slides", "image", "video", "audio")


def capability_payloads() -> list[dict]:
    """A mode is offered when the catalog has models for it.

    The upstream key is not checked here: outside development the server
    refuses to start without it (settings.py), so the catalog is the only
    thing that can make a mode empty.
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
        {"id": "image", "available": bool(image_count), "modelCount": image_count},
        {"id": "video", "available": bool(video_count), "modelCount": video_count},
        {"id": "audio", "available": bool(audio_count), "modelCount": audio_count},
    ]
