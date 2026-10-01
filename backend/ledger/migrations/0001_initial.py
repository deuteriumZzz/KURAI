import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.db.models import Q


class Migration(migrations.Migration):
    initial = True

    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="CreditAccount",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("owner", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="credit_account", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="LedgerEntry",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("amount_micro", models.BigIntegerField()),
                ("kind", models.CharField(choices=[("grant", "Grant"), ("charge", "Charge"), ("refund", "Refund"), ("adjustment", "Adjustment")], max_length=16)),
                ("correlation_id", models.CharField(max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("account", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="entries", to="ledger.creditaccount")),
            ],
        ),
        migrations.AddConstraint(model_name="ledgerentry", constraint=models.CheckConstraint(condition=~Q(("amount_micro", 0)), name="ledger_entry_amount_nonzero")),
        migrations.AddIndex(model_name="ledgerentry", index=models.Index(fields=["account", "-created_at"], name="ledger_account_created_ix")),
    ]
