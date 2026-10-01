import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import sharing.models


class Migration(migrations.Migration):
    initial = True

    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL), ("workspace", "0001_initial")]

    operations = [
        migrations.CreateModel(
            name="ShareLink",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("token", models.CharField(default=sharing.models.share_token, editable=False, max_length=64, unique=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("revoked_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("chat", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="share_links", to="workspace.chat")),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="share_links", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddIndex(model_name="sharelink", index=models.Index(fields=["token"], name="share_token_ix")),
    ]
