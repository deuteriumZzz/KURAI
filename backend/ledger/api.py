from drf_spectacular.utils import extend_schema
from django.db import transaction
from rest_framework import serializers
from rest_framework.response import Response

from kurai.api import KuraiAPIView
from ledger.models import LedgerEntry
from ledger.services import available_balance_micro, locked_credit_account


ENTRY_TITLES = {
    LedgerEntry.Kind.GRANT: "Начисление кредитов",
    LedgerEntry.Kind.CHARGE: "Запрос к модели",
    LedgerEntry.Kind.REFUND: "Возврат кредитов",
    LedgerEntry.Kind.ADJUSTMENT: "Корректировка баланса",
}


def ledger_entry_payload(entry: LedgerEntry) -> dict:
    """Expose an immutable receipt row without revealing correlation internals."""
    return {
        "id": str(entry.id),
        "at": entry.created_at.isoformat(),
        "kind": entry.kind,
        "title": ENTRY_TITLES[entry.kind],
        "model": None,
        "chatId": None,
        "amountMicro": entry.amount_micro,
    }


class LedgerEnvelopeSerializer(serializers.Serializer):
    data = serializers.DictField()


class LedgerView(KuraiAPIView):
    @extend_schema(responses=LedgerEnvelopeSerializer)
    def get(self, request):
        with transaction.atomic():
            account = locked_credit_account(request.user)
            available_micro = available_balance_micro(account)
            entries = list(LedgerEntry.objects.filter(account=account).order_by("-created_at", "-id")[:50])
        return Response({"data": {"availableMicro": available_micro, "entries": [ledger_entry_payload(entry) for entry in entries]}})
