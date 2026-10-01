import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("runs", "0001_initial")]
    operations = [
        migrations.CreateModel(
            name="RunAttempt",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("provider", models.CharField(max_length=32)),
                ("requested_model", models.CharField(max_length=160)),
                ("resolved_model", models.CharField(blank=True, max_length=160)),
                ("provider_request_id", models.CharField(blank=True, max_length=160)),
                ("status", models.CharField(choices=[("running", "Running"), ("completed", "Completed"), ("failed", "Failed")], default="running", max_length=16)),
                ("billed_cost_micro", models.BigIntegerField(blank=True, null=True)),
                ("error_code", models.CharField(blank=True, max_length=80)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("run", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="attempts", to="runs.run")),
            ],
        )
    ]
