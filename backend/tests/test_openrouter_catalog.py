from decimal import Decimal
from unittest.mock import patch

from django.test.utils import override_settings

from model_catalog.models import CatalogModel
from model_catalog.openrouter import fetch_full_catalog, sync_catalog
from runs.providers.openrouter import decimal_or_none


def test_openrouter_usage_cost_is_parsed_without_accepting_invalid_values():
    assert decimal_or_none("0.00125") == Decimal("0.00125")
    assert decimal_or_none(0.125) == Decimal("0.125")
    assert decimal_or_none(None) is None
    assert decimal_or_none("not-a-number") is None
    assert decimal_or_none("NaN") is None


def test_catalog_sync_upserts_current_models_and_deactivates_missing_entries(db):
    CatalogModel.objects.create(id="old/model", name="Old", provider="Old", input_modalities=["text"], output_modalities=["text"])

    count = sync_catalog(
        [
            {
                "id": "openai/gpt-test",
                "name": "GPT Test",
                "description": "A test model",
                "context_length": 200000,
                "architecture": {"input_modalities": ["text", "image"], "output_modalities": ["text"]},
                "pricing": {"prompt": "0.000001", "completion": "0.000002"},
            }
        ]
    )

    model = CatalogModel.objects.get(id="openai/gpt-test")
    assert count == 1
    assert model.context_length == 200000
    assert model.supports_chat is True
    assert str(model.prompt_price_usd_per_token) == "0.000001000000000"
    assert CatalogModel.objects.get(id="old/model").active is False


def test_catalog_sync_merges_the_dedicated_video_registry_without_losing_chat_capability(db):
    sync_catalog(
        [
            {
                "id": "acme/multimodal",
                "name": "Acme Multimodal",
                "architecture": {"input_modalities": ["text"], "output_modalities": ["text"]},
                "pricing": {"prompt": "0.000001", "completion": "0.000002"},
            },
            {
                "id": "acme/multimodal",
                "name": "Acme Multimodal",
                "architecture": {"input_modalities": ["text"], "output_modalities": ["video"]},
                "pricing": {"video": "0.03"},
            },
        ]
    )

    model = CatalogModel.objects.get(id="acme/multimodal")
    assert model.supports_chat is True
    assert model.supports_video is True
    assert model.supported_modes() == ["text", "research", "slides", "video"]
    assert str(model.video_price_usd_per_second) == "0.030000000000000"


REGISTRIES = {
    "images/models": [
        {"id": "acme/painter", "supported_parameters": {"n": {"type": "range", "min": 1, "max": 4}}},
        {"id": "acme/retoucher", "supported_parameters": {"input_references": {"type": "range", "min": 1, "max": 8}}},
    ],
    "models?output_modalities=image": [
        {"id": "acme/painter", "name": "Painter", "pricing": {"image": "0.0000003", "image_output": "0.00001"}},
        {"id": "acme/retoucher", "name": "Retoucher", "pricing": {"image_output": "0.00001"}},
        {"id": "acme/painter-vector", "name": "Painter Vector", "pricing": {"image_output": "0.00001"}},
        {"id": "openrouter/auto", "name": "Auto", "pricing": {"prompt": "-1", "completion": "-1"}},
    ],
    "models?output_modalities=speech": [
        {"id": "acme/voice", "name": "Voice", "pricing": {"prompt": "0.00004", "completion": "0"}, "supported_voices": ["nadine", "bram"]},
        {"id": "acme/voice-tokens", "name": "Voice by tokens", "pricing": {"prompt": "0.0000005", "completion": "0.000009"}},
    ],
    "videos/models": [
        {
            "id": "acme/clip", "name": "Clip", "supported_durations": [4, 6, 8], "supported_resolutions": ["480p", "720p", "1080p"],
            "supported_aspect_ratios": ["16:9", "9:16"],
            "pricing_skus": {"cents_per_image_input": "1", "duration_seconds_480p": "0.02", "duration_seconds_720p": "0.05", "duration_seconds_1080p": "0.2"},
        },
        {"id": "acme/tokens", "name": "Tokens", "supported_durations": [5], "pricing_skus": {"video_tokens": "0.0000012"}},
        {"id": "acme/upscale", "name": "Upscale", "supported_durations": None, "pricing_skus": {"cents_per_second_output": "3"}},
    ],
}


@override_settings(KURAI_IMAGE_OUTPUT_TOKENS=4200)
def test_media_registries_add_only_models_that_start_from_text_with_a_known_price(db):
    with patch("model_catalog.openrouter.fetch_list", side_effect=lambda path: REGISTRIES.get(path, [])):
        sync_catalog(fetch_full_catalog())

    painter = CatalogModel.objects.get(id="acme/painter")
    assert painter.supported_modes() == ["image"]
    # цена генерации — токены картинки, а не цена входного изображения
    assert painter.image_price_usd_per_generation == Decimal("0.042")
    assert not CatalogModel.objects.filter(id__in=["acme/retoucher", "acme/painter-vector"]).exists()
    assert CatalogModel.objects.get(id="acme/voice").media_spec == {"voices": ["nadine", "bram"]}
    assert CatalogModel.objects.get(id="acme/voice").supported_modes() == ["audio"]
    assert CatalogModel.objects.get(id="acme/voice").audio_price_usd_per_character == Decimal("0.00004")
    assert not CatalogModel.objects.filter(id="acme/voice-tokens").exists()
    clip = CatalogModel.objects.get(id="acme/clip")
    assert clip.supported_modes() == ["video"]
    assert clip.media_spec == {"durations": [4, 6, 8], "resolution": "720p", "aspects": ["16:9", "9:16"]}
    # цена — за секунду в том разрешении, которое KURAI заказывает
    assert clip.video_price_usd_per_second == Decimal("0.05")
    assert not CatalogModel.objects.filter(id__in=["acme/upscale", "acme/tokens"]).exists()


def test_routers_are_never_offered_for_media(db):
    router = CatalogModel.objects.create(id="openrouter/auto-beta", name="Auto", provider="OpenRouter", input_modalities=["text"], output_modalities=["text", "image"])
    assert router.supports_image is False


def test_video_length_snaps_to_what_the_model_accepts():
    clip = CatalogModel(id="acme/clip", media_spec={"durations": [4, 6, 8]})
    assert [clip.video_seconds(value) for value in (4, 5, 8, 10)] == [4, 6, 8, 8]
    assert CatalogModel(id="acme/any").video_seconds(5) == 5


def test_members_never_see_the_upstream_gateway_in_the_catalog(db):
    sync_catalog([
        {"id": "openrouter/auto", "name": "Auto Router", "description": "Routes your prompt via OpenRouter.",
         "architecture": {"input_modalities": ["text"], "output_modalities": ["text"]}, "pricing": {"prompt": "-1", "completion": "-1"}},
        {"id": "openrouter/fusion", "name": "OpenRouter: Fusion", "architecture": {"input_modalities": ["text"], "output_modalities": ["text"]}},
        {"id": "acme/writer", "name": "Acme Writer", "description": "Fast drafts. Available exclusively on OpenRouter. Great at Russian.",
         "architecture": {"input_modalities": ["text"], "output_modalities": ["text"]}, "pricing": {"prompt": "0.000001", "completion": "0.000002"}},
    ])

    auto = CatalogModel.objects.get(id="openrouter/auto")
    assert (auto.name, auto.provider, auto.description, auto.is_router) == ("Авто", "KURAI", "", True)
    assert not CatalogModel.objects.filter(id="openrouter/fusion").exists()
    assert CatalogModel.objects.get(id="acme/writer").description == "Fast drafts. Great at Russian."
