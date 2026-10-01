import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.db.models import Q


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("ledger", "0001_initial"),
        ("workspace", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Quote",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("mode", models.CharField(max_length=24)),
                ("request_hash", models.CharField(max_length=64)),
                ("resolved_model", models.CharField(default="auto", max_length=80)),
                ("estimated_cost_micro", models.BigIntegerField()),
                ("expires_at", models.DateTimeField()),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="quotes", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="Run",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("mode", models.CharField(max_length=24)),
                ("status", models.CharField(choices=[("queued", "Queued"), ("running", "Running"), ("completed", "Completed"), ("failed", "Failed"), ("cancel_requested", "Cancel requested"), ("canceled", "Canceled")], default="queued", max_length=24)),
                ("idempotency_key", models.CharField(max_length=128)),
                ("payload_hash", models.CharField(max_length=64)),
                ("estimated_cost_micro", models.BigIntegerField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("chat", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="runs", to="workspace.chat")),
                ("input_message", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="input_runs", to="workspace.message")),
                ("output_message", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="output_runs", to="workspace.message")),
                ("quote", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="runs", to="runs.quote")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="runs", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="CreditHold",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("reserved_micro", models.BigIntegerField()),
                ("released_at", models.DateTimeField(blank=True, null=True)),
                ("consumed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("account", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="holds", to="ledger.creditaccount")),
                ("run", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="hold", to="runs.run")),
            ],
        ),
        migrations.CreateModel(
            name="RunEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("seq", models.PositiveIntegerField()),
                ("type", models.CharField(choices=[("queued", "Queued"), ("routed", "Routed"), ("delta", "Delta"), ("done", "Done"), ("error", "Error"), ("canceled", "Canceled")], max_length=16)),
                ("payload", models.JSONField(default=dict)),
                ("occurred_at", models.DateTimeField(auto_now_add=True)),
                ("run", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="runs.run")),
            ],
            options={"ordering": ("seq",)},
        ),
        migrations.AddConstraint(model_name="run", constraint=models.UniqueConstraint(fields=("user", "idempotency_key"), name="runs_user_idempotency_uniq")),
        migrations.AddIndex(model_name="run", index=models.Index(fields=["user", "-updated_at"], name="run_user_updated_ix")),
        migrations.AddIndex(model_name="quote", index=models.Index(fields=["user", "expires_at"], name="run_quote_user_expiry_ix")),
        migrations.AddConstraint(model_name="credithold", constraint=models.CheckConstraint(condition=Q(("reserved_micro__gt", 0)), name="run_hold_amount_positive")),
        migrations.AddConstraint(model_name="runevent", constraint=models.UniqueConstraint(fields=("run", "seq"), name="run_event_sequence_uniq")),
    ]
