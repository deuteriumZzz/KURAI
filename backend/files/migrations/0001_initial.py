import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import files.models


class Migration(migrations.Migration):
    initial = True

    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL), ("workspace", "0001_initial")]

    operations = [
        migrations.CreateModel(
            name="FileAsset",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("file", models.FileField(upload_to=files.models.asset_path)),
                ("original_name", models.CharField(max_length=255)),
                ("content_type", models.CharField(max_length=120)),
                ("size_bytes", models.PositiveBigIntegerField()),
                ("sha256", models.CharField(max_length=64)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("chat", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="files", to="workspace.chat")),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="files", to=settings.AUTH_USER_MODEL)),
                ("project", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="files", to="workspace.project")),
            ],
            options={"ordering": ("-created_at",)},
        ),
        migrations.AddIndex(model_name="fileasset", index=models.Index(fields=["owner", "-created_at"], name="file_owner_created_ix")),
    ]
