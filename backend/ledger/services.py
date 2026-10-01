from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from ledger.models import CreditAccount, LedgerEntry


class InsufficientCreditsError(Exception):
    pass


def locked_credit_account(user) -> CreditAccount:
    account, _ = CreditAccount.objects.get_or_create(owner=user)
    return CreditAccount.objects.select_for_update().get(pk=account.pk)


def posted_balance_micro(account: CreditAccount) -> int:
    return account.entries.aggregate(total=Sum("amount_micro"))["total"] or 0


def available_balance_micro(account: CreditAccount) -> int:
    from runs.models import CreditHold

    reserved = CreditHold.objects.filter(account=account, released_at__isnull=True, consumed_at__isnull=True).aggregate(total=Sum("reserved_micro"))["total"] or 0
    return posted_balance_micro(account) - reserved


@transaction.atomic
def grant_credits(user, amount_micro: int, correlation_id: str) -> LedgerEntry:
    if amount_micro <= 0:
        raise ValueError("Credit grants must be positive")
    account = locked_credit_account(user)
    return LedgerEntry.objects.create(
        account=account,
        amount_micro=amount_micro,
        kind=LedgerEntry.Kind.GRANT,
        correlation_id=correlation_id,
    )


def reserve_credits(*, user, run, estimated_micro: int):
    from runs.models import CreditHold

    account = locked_credit_account(user)
    if available_balance_micro(account) < estimated_micro:
        raise InsufficientCreditsError
    return CreditHold.objects.create(run=run, account=account, reserved_micro=estimated_micro)


def release_hold(hold) -> None:
    if hold.released_at is None and hold.consumed_at is None:
        hold.released_at = timezone.now()
        hold.save(update_fields=("released_at",))


def consume_hold(hold, actual_micro: int) -> LedgerEntry | None:
    if actual_micro <= 0 or actual_micro > hold.reserved_micro:
        raise ValueError("Actual cost must be positive and not exceed the reserve")
    if hold.released_at is not None:
        raise ValueError("A released hold cannot be consumed")
    if hold.consumed_at is not None:
        return None
    entry, _ = LedgerEntry.objects.get_or_create(
        account=hold.account,
        kind=LedgerEntry.Kind.CHARGE,
        correlation_id=str(hold.run_id),
        defaults={"amount_micro": -actual_micro},
    )
    hold.consumed_at = timezone.now()
    hold.save(update_fields=("consumed_at",))
    return entry
