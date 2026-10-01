from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("workspace", "0004_recipe")]

    operations = [
        migrations.AddConstraint(
            model_name="recipe",
            constraint=models.UniqueConstraint(fields=("owner", "source_message"), name="ws_recipe_owner_source_uniq"),
        ),
    ]
