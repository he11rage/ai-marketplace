from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("moderation", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="adminactionlog",
            name="ip_address",
            field=models.GenericIPAddressField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="adminactionlog",
            name="user_agent",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="adminactionlog",
            name="request_method",
            field=models.CharField(blank=True, default="", max_length=10),
        ),
        migrations.AddField(
            model_name="adminactionlog",
            name="request_path",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]

