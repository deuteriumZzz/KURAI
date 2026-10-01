import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class CreditAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="credit_account")
    created_at = models.DateTimeField(auto_now_add=True)


class LedgerEntry(models.Model):
    class Kind(models.TextChoices):
        GRANT = "grant", "Grant"
        CHARGE = "charge", "Charge"
        REFUND = "refund", "Refund"
        ADJUSTMENT = "adjustment", "Adjustment"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(CreditAccount, on_delete=models.PROTECT, related_name="entries")
    amount_micro = models.BigIntegerField()
    kind = models.CharField(max_length=16, choices=Kind.choices)
    correlation_id = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=~Q(amount_micro=0), name="ledger_entry_amount_nonzero"),
            models.UniqueConstraint(fields=("account", "kind", "correlation_id"), name="ledger_entry_correlation_uniq"),
        ]
        indexes = [models.Index(fields=("account", "-created_at"), name="ledger_account_created_ix")]
