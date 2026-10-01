import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from ledger.models import LedgerEntry
from ledger.services import grant_credits


def test_ledger_correlation_is_unique_per_account_and_kind(db):
    member = get_user_model().objects.create_user(email="ledger@example.test", password="safe-test-password")
    grant_credits(member, 50_000, correlation_id="seed")

    with pytest.raises(IntegrityError):
        grant_credits(member, 50_000, correlation_id="seed")

    assert LedgerEntry.objects.filter(account=member.credit_account).count() == 1
