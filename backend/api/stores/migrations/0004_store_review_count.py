from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("stores", "0003_store_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="store",
            name="review_count",
            field=models.IntegerField(default=0),
        ),
    ]

