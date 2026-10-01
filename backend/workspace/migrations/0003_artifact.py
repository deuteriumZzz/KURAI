import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("workspace", "0002_message_model_lengths"),
    ]

    operations = [
        migrations.CreateModel(
            name="Artifact",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("kind", models.CharField(choices=[("document", "Document"), ("specification", "Specification"), ("table", "Table"), ("recipe", "Recipe"), ("research_packet", "Research packet")], default="document", max_length=24)),
                ("title", models.CharField(max_length=160)),
                ("body", models.TextField()),
                ("provenance", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("chat", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="artifacts", to="workspace.chat")),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="artifacts", to=settings.AUTH_USER_MODEL)),
                ("project", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="artifacts", to="workspace.project")),
                ("source_message", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="artifacts", to="workspace.message")),
            ],
            options={"ordering": ("-created_at",)},
        ),
        migrations.AddIndex(
            model_name="artifact",
            index=models.Index(fields=["owner", "-created_at"], name="ws_artifact_owner_created_ix"),
        ),
    ]
