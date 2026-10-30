from django.contrib.auth import get_user_model
from django.test import override_settings

from ledger.services import available_balance_micro, grant_signup_bonus


def member(n):
    return get_user_model().objects.create_user(email=f"bonus{n}@example.test", password="safe-test-password")


@override_settings(KURAI_SIGNUP_BONUS_MICRO=100_000, KURAI_SIGNUP_BONUS_DAILY_LIMIT=2)
def test_bonus_is_capped_per_day_and_later_members_still_get_an_account(db):
    first, second, third = member(1), member(2), member(3)
    assert grant_signup_bonus(first) is not None
    assert grant_signup_bonus(second) is not None
    assert grant_signup_bonus(third) is None
    assert available_balance_micro(first.credit_account) == 100_000
    assert not hasattr(third, "credit_account") or available_balance_micro(third.credit_account) == 0


@override_settings(KURAI_SIGNUP_BONUS_MICRO=0)
def test_zero_bonus_turns_the_gift_off(db):
    assert grant_signup_bonus(member(4)) is None
