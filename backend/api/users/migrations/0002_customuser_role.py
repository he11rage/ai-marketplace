from django.db import migrations, models


def assign_roles_from_existing_data(apps, schema_editor):
    User = apps.get_model("users", "CustomUser")
    Store = apps.get_model("stores", "Store")

    seller_ids = set(
        Store.objects.values_list("owner_id", flat=True).distinct()
    )

    for user in User.objects.all().iterator():
        if user.is_admin or user.is_staff or user.is_superuser:
            user.role = "admin"
        elif user.id in seller_ids:
            user.role = "seller"
        else:
            user.role = "buyer"
        user.save(update_fields=["role", "is_admin"])


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
        ("stores", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="role",
            field=models.CharField(
                choices=[
                    ("buyer", "Покупатель"),
                    ("seller", "Продавец"),
                    ("admin", "Администратор"),
                ],
                db_index=True,
                default="buyer",
                max_length=20,
            ),
        ),
        migrations.RunPython(assign_roles_from_existing_data, migrations.RunPython.noop),
    ]
