from django.db import migrations, models


def migrate_confirmed_status(apps, schema_editor):
    Order = apps.get_model('orders', 'Order')
    Order.objects.filter(status='confirmed', payment_method='cash').update(status='processing')
    Order.objects.filter(status='confirmed').exclude(payment_method='cash').update(status='paid')


def restore_confirmed_status(apps, schema_editor):
    Order = apps.get_model('orders', 'Order')
    Order.objects.filter(status='awaiting_payment').update(status='created')
    Order.objects.filter(status__in=['paid', 'processing', 'shipped', 'delivered']).update(status='confirmed')
    Order.objects.filter(status='refunded').update(status='cancelled')


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0003_order_payment_method'),
    ]

    operations = [
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(
                choices=[
                    ('created', 'Created'),
                    ('awaiting_payment', 'Awaiting Payment'),
                    ('paid', 'Paid'),
                    ('processing', 'Processing'),
                    ('shipped', 'Shipped'),
                    ('delivered', 'Delivered'),
                    ('cancelled', 'Cancelled'),
                    ('refunded', 'Refunded'),
                ],
                default='created',
                max_length=16,
            ),
        ),
        migrations.RunPython(migrate_confirmed_status, restore_confirmed_status),
    ]
