from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("workspace", "0001_initial")]
    operations = [
        migrations.AlterField(model_name="message", name="requested_model", field=models.CharField(blank=True, max_length=160)),
        migrations.AlterField(model_name="message", name="resolved_model", field=models.CharField(blank=True, max_length=160)),
    ]
