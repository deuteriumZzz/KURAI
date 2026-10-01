# Generated manually to keep the pricing snapshot fields explicit and append-only.
from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("model_catalog", "0002_catalogmodel_image_price_usd_per_generation")]

    operations = [
        migrations.AddField(
            model_name="catalogmodel",
            name="audio_price_usd_per_character",
            field=models.DecimalField(decimal_places=15, default=Decimal("0"), max_digits=22),
        ),
        migrations.AddField(
            model_name="catalogmodel",
            name="video_price_usd_per_second",
            field=models.DecimalField(decimal_places=15, default=Decimal("0"), max_digits=22),
        ),
    ]
