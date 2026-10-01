from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("media", "0001_initial")]

    operations = [
        migrations.AlterField(
            model_name="generatedasset",
            name="kind",
            field=models.CharField(choices=[("image", "Image"), ("video", "Video"), ("audio", "Audio")], max_length=16),
        ),
    ]
