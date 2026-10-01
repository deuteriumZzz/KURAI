# Generated manually to keep the immutable public-share contract explicit.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("sharing", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="sharelink",
            name="snapshot",
            field=models.JSONField(default=dict),
        ),
    ]
