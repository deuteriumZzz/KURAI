import uuid

from drf_spectacular.utils import extend_schema
from django.db import transaction
from rest_framework import serializers
from rest_framework.response import Response

from kurai.api import KuraiAPIView
from ledger.models import LedgerEntry
from ledger.services import available_balance_micro, locked_credit_account
from runs.models import Run


ENTRY_TITLES = {
    LedgerEntry.Kind.GRANT: "Начисление кредитов",
    LedgerEntry.Kind.CHARGE: "Запрос к модели",
    LedgerEntry.Kind.REFUND: "Возврат кредитов",
    LedgerEntry.Kind.ADJUSTMENT: "Корректировка баланса",
}


def ledger_entry_payload(entry: LedgerEntry, run: dict | None = None) -> dict:
    """Expose an immutable receipt row without revealing correlation internals; a charge names its model and chat."""
    return {
        "id": str(entry.id),
        "at": entry.created_at.isoformat(),
        "kind": entry.kind,
        "title": ENTRY_TITLES[entry.kind],
        "model": (run or {}).get("model"),
        "chatId": (run or {}).get("chatId"),
        "mode": (run or {}).get("mode"),
        "amountMicro": entry.amount_micro,
    }


def runs_for(entries: list[LedgerEntry], user) -> dict[str, dict]:
    """Charges correlate to the member's own runs; anything else stays anonymous."""
    ids = []
    for entry in entries:
        try:
            ids.append(uuid.UUID(entry.correlation_id))
        except ValueError:
            continue
    rows = Run.objects.filter(id__in=ids, user=user).values("id", "chat_id", "mode", "output_message__resolved_model", "quote__resolved_model")
    return {
        str(row["id"]): {"model": row["output_message__resolved_model"] or row["quote__resolved_model"], "chatId": str(row["chat_id"]), "mode": row["mode"]}
        for row in rows
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
        runs = runs_for(entries, request.user)
        return Response({"data": {"availableMicro": available_micro, "entries": [ledger_entry_payload(entry, runs.get(entry.correlation_id)) for entry in entries]}})
