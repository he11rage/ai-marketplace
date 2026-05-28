from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("stores", "0004_store_review_count"),
    ]

    operations = [
        migrations.AddField(
            model_name="store",
            name="is_verified",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="store",
            name="rating_manual",
            field=models.DecimalField(blank=True, decimal_places=1, max_digits=2, null=True),
        ),
    ]

