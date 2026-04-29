from django.db import models
from django.conf import settings
from api.products.models import Product

class Order(models.Model):
    """Заказ"""
    STATUS_CHOICES = [
        ('created', 'Created'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
    ]

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders'
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='created')
    delivery_address = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders'
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'

    def __str__(self):
        return f"Order #{self.id} by {self.buyer.username}"

class OrderItem(models.Model):
    """Позиция заказа"""
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='order_items'
    )
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Цена на момент покупки

    class Meta:
        db_table = 'order_items'

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"