from decimal import Decimal

from django.db import migrations, models


def seed_auto_router(apps, schema_editor):
    CatalogModel = apps.get_model("model_catalog", "CatalogModel")
    CatalogModel.objects.update_or_create(
        id="openrouter/auto",
        defaults={
            "name": "OpenRouter Auto",
            "provider": "OpenRouter",
            "description": "Маршрутизатор OpenRouter выбирает модель под запрос.",
            "input_modalities": ["text"],
            "output_modalities": ["text"],
            "context_length": 0,
            "prompt_price_usd_per_token": Decimal("0.000001"),
            "completion_price_usd_per_token": Decimal("0.000002"),
            "active": True,
            "is_router": True,
        },
    )


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="CatalogModel",
            fields=[
                ("id", models.CharField(max_length=160, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=200)),
                ("provider", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True)),
                ("input_modalities", models.JSONField(default=list)),
                ("output_modalities", models.JSONField(default=list)),
                ("context_length", models.PositiveIntegerField(default=0)),
                ("prompt_price_usd_per_token", models.DecimalField(decimal_places=15, default=Decimal("0"), max_digits=22)),
                ("completion_price_usd_per_token", models.DecimalField(decimal_places=15, default=Decimal("0"), max_digits=22)),
                ("active", models.BooleanField(default=True)),
                ("is_router", models.BooleanField(default=False)),
                ("synced_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"indexes": [models.Index(fields=["active", "name"], name="catalog_active_name_ix")]},
        ),
        migrations.RunPython(seed_auto_router, migrations.RunPython.noop),
    ]
