from django.db import migrations, models


def mark_existing_stores_active(apps, schema_editor):
    Store = apps.get_model('stores', 'Store')
    Store.objects.update(status='active')


def restore_default_store_status(apps, schema_editor):
    Store = apps.get_model('stores', 'Store')
    Store.objects.update(status='pending_moderation')


class Migration(migrations.Migration):

    dependencies = [
        ('stores', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='store',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending_moderation', 'Pending Moderation'),
                    ('active', 'Active'),
                    ('limited', 'Limited'),
                    ('blocked', 'Blocked'),
                    ('rejected', 'Rejected'),
                ],
                default='pending_moderation',
                max_length=20,
            ),
        ),
        migrations.RunPython(mark_existing_stores_active, restore_default_store_status),
    ]
