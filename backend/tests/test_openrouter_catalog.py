from decimal import Decimal

from model_catalog.models import CatalogModel
from model_catalog.openrouter import sync_catalog
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
