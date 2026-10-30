import io
import json
from unittest.mock import patch

from django.core.cache import cache
from django.test import Client, SimpleTestCase, override_settings

from kurai.fx import usd_rates

BODY = {"result": "success", "time_last_update_utc": "Fri, 30 Oct 2026 00:02:31 +0000", "rates": {"USD": 1, "RUB": 80.5, "EUR": 0.9, "BAD": -1}}


def response(body):
    return io.BytesIO(json.dumps(body).encode())


@override_settings(KURAI_FX_BUFFER=0.0, KURAI_FX_THRESHOLD=0.0)
class FxTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    def test_rates_are_fetched_cached_and_filtered(self):
        with patch("kurai.fx.urlopen", return_value=response(BODY)) as opened:
            first = usd_rates()
            second = usd_rates()
        assert opened.call_count == 1
        assert first == second
        assert first["rates"] == {"USD": 1.0, "RUB": 80.5, "EUR": 0.9}

    def test_source_failure_keeps_the_last_good_rates_and_backs_off(self):
        with patch("kurai.fx.urlopen", return_value=response(BODY)):
            good = usd_rates()
        cache.delete("fx:usd:fresh")
        with patch("kurai.fx.urlopen", side_effect=OSError("down")) as opened:
            assert usd_rates() == good
            assert usd_rates() == good
        assert opened.call_count == 1

    def test_no_rates_ever_means_none_not_a_made_up_number(self):
        with patch("kurai.fx.urlopen", side_effect=OSError("down")):
            assert usd_rates() is None

    def test_endpoint_is_public_and_returns_null_when_unavailable(self):
        with patch("kurai.fx.urlopen", side_effect=OSError("down")):
            reply = Client().get("/api/v1/fx")
        assert reply.status_code == 200
        assert reply.json() == {"data": None}


@override_settings(KURAI_FX_BUFFER=0.02, KURAI_FX_THRESHOLD=0.015)
class FxPublishingTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    def fetch(self, rub):
        cache.delete("fx:usd:fresh")
        cache.delete("fx:usd:backoff")
        with patch("kurai.fx.urlopen", return_value=response({**BODY, "rates": {"USD": 1, "RUB": rub}})):
            return usd_rates()["rates"]

    def test_shown_rate_carries_the_conversion_buffer_but_dollars_stay_one(self):
        shown = self.fetch(80.0)
        assert shown["USD"] == 1
        assert round(shown["RUB"], 4) == 81.6

    def test_small_moves_do_not_change_the_shown_rate_big_ones_do(self):
        first = self.fetch(80.0)["RUB"]
        assert self.fetch(80.8)["RUB"] == first  # +1% — внутри порога
        assert self.fetch(83.0)["RUB"] > first  # +3,75% — обновили
