import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("files", "0001_initial"), ("runs", "0002_runattempt")]
    operations = [
        migrations.AddField(model_name="quote", name="attachment_ids", field=models.JSONField(default=list)),
        migrations.AlterField(model_name="quote", name="resolved_model", field=models.CharField(default="openrouter/auto", max_length=160)),
        migrations.CreateModel(
            name="RunAttachment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("file", models.ForeignKey(on_delete=models.deletion.PROTECT, related_name="run_attachments", to="files.fileasset")),
                ("run", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="attachments", to="runs.run")),
            ],
            options={"constraints": [models.UniqueConstraint(fields=("run", "file"), name="run_attachment_unique")]},
        ),
    ]
