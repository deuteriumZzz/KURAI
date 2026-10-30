from decimal import Decimal

from django.test import SimpleTestCase, override_settings

from runs.services import usd_to_micro
from runs.worker import micro_from_usd


class MarkupTests(SimpleTestCase):
    @override_settings(KURAI_MARKUP=Decimal("1.5"), KURAI_CREDITS_PER_USD=1_000_000)
    def test_reserve_and_settlement_use_the_same_markup(self):
        usd = Decimal("0.02")
        assert usd_to_micro(usd) == micro_from_usd(usd, fallback=0) == 30_000

    @override_settings(KURAI_MARKUP=Decimal("1"), KURAI_CREDITS_PER_USD=1_000_000)
    def test_markup_one_is_the_raw_provider_price(self):
        assert usd_to_micro(Decimal("0.02")) == 20_000

    def test_missing_cost_falls_back_to_the_reserved_amount(self):
        assert micro_from_usd(None, fallback=777) == 777


class PricePerMillionTests(SimpleTestCase):
    @override_settings(KURAI_MARKUP=Decimal("1.5"), KURAI_CREDITS_PER_USD=1_000_000)
    def test_per_million_price_carries_the_markup(self):
        from model_catalog.api import price_per_million_micro
        from model_catalog.models import CatalogModel

        text = CatalogModel(
            id="acme/chat", input_modalities=["text"], output_modalities=["text"],
            prompt_price_usd_per_token=Decimal("0.000003"), completion_price_usd_per_token=Decimal("0.000015"),
        )
        assert price_per_million_micro(text) == {"input": 4_500_000, "output": 22_500_000}

    def test_routers_and_variable_prices_have_no_per_million_price(self):
        from model_catalog.api import price_per_million_micro
        from model_catalog.models import CatalogModel

        router = CatalogModel(id="openrouter/auto", is_router=True, input_modalities=["text"], output_modalities=["text"])
        variable = CatalogModel(id="acme/var", input_modalities=["text"], output_modalities=["text"], prompt_price_usd_per_token=Decimal("-1"))
        image = CatalogModel(id="acme/img", input_modalities=["text"], output_modalities=["image"])
        assert price_per_million_micro(router) is None
        assert price_per_million_micro(variable) is None
        assert price_per_million_micro(image) is None
