import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("workspace", "0003_artifact"),
    ]

    operations = [
        migrations.CreateModel(
            name="Recipe",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=160)),
                ("prompt", models.TextField(max_length=20000)),
                ("mode", models.CharField(max_length=24)),
                ("model", models.CharField(blank=True, max_length=160)),
                ("source_cost_micro", models.BigIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("chat", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recipes", to="workspace.chat")),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recipes", to=settings.AUTH_USER_MODEL)),
                ("project", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="recipes", to="workspace.project")),
                ("source_message", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recipes", to="workspace.message")),
            ],
            options={"ordering": ("-created_at",)},
        ),
        migrations.AddIndex(
            model_name="recipe",
            index=models.Index(fields=["owner", "-created_at"], name="ws_recipe_owner_created_ix"),
        ),
    ]
