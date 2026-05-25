from django.db import migrations, models


def mark_existing_products_active(apps, schema_editor):
    Product = apps.get_model("products", "Product")
    Product.objects.update(status="active")


def restore_default_product_status(apps, schema_editor):
    Product = apps.get_model("products", "Product")
    Product.objects.update(status="pending_moderation")


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0004_wishlistitem"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("pending_moderation", "Pending Moderation"),
                    ("active", "Active"),
                    ("rejected", "Rejected"),
                    ("blocked", "Blocked"),
                    ("archived", "Archived"),
                ],
                default="pending_moderation",
                max_length=20,
            ),
        ),
        migrations.RunPython(mark_existing_products_active, restore_default_product_status),
    ]
