from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("ledger", "0001_initial")]

    operations = [
        migrations.AddConstraint(
            model_name="ledgerentry",
            constraint=models.UniqueConstraint(fields=("account", "kind", "correlation_id"), name="ledger_entry_correlation_uniq"),
        )
    ]
